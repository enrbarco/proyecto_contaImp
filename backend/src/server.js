import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import {rateLimit} from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import nodemailer from 'nodemailer';
import {pool,query} from './db.js';

if(!process.env.JWT_SECRET||process.env.JWT_SECRET.length<32||!process.env.DATABASE_URL){console.error('Configura JWT_SECRET (32 caracteres mínimo) y DATABASE_URL en backend/.env');process.exit(1)}
const app = express();

// ContaImp se ejecuta detrás del proxy de Vercel.
app.set('trust proxy', 1);

app.use(helmet());
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());
const authLimit=rateLimit({windowMs:15*60*1000,limit:20,standardHeaders:'draft-7',legacyHeaders:false});
const fail=(res,status,msg)=>res.status(status).json({error:msg});
const asyncRoute=fn=>(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);
function userSafe(row){return {id:row.id,name:row.name,email:row.email,role:row.role}}
async function auth(req,res,next){
 try{
  const token=req.cookies.contaimp_session;
  if(!token)return fail(res,401,'Debes iniciar sesión');
  const payload=jwt.verify(token,process.env.JWT_SECRET,{algorithms:['HS256']});
  const r=await query('select id,role,active,password_version from users where id=$1',[payload.id]);
  if(!r.rowCount||!r.rows[0].active||r.rows[0].role!==payload.role||r.rows[0].password_version!==payload.passwordVersion)return fail(res,401,'Sesión no válida o vencida');
  req.user=payload;next();
 }catch(err){if(err?.code)return next(err);return fail(res,401,'Sesión no válida o vencida')}
} 
async function canAccess(user,companyId){if(user.role==='administrador')return true;const r=await query('select 1 from user_company where user_id=$1 and company_id=$2',[user.id,companyId]);return r.rowCount>0}
async function formForUser(user,id){
 const r=await query(`select f.*, c.name as company_name,p.month as period_month,p.status as period_status,p.closed_at,cu.name as closed_by_name,t.name as template_name from forms f join companies c on c.id=f.company_id join periods p on p.id=f.period_id left join users cu on cu.id=p.closed_by join templates t on t.id=f.template_id where f.id=$1`,[id]);
 if(!r.rowCount)return {kind:'not-found'};
 const form=r.rows[0];
 if(!(await canAccess(user,form.company_id)))return {kind:'forbidden'};
 return {kind:'ok',form};
}
function formAccessFailure(res,access){
 if(access.kind==='forbidden')return fail(res,403,'No tienes permiso para consultar controles de esta empresa');
 if(access.kind==='not-found')return fail(res,404,'Formulario no encontrado');
 return null;
}
async function activityForUser(user,id){
 const r=await query('select id,form_id,note from activities where id=$1',[id]);
 if(!r.rowCount)return {kind:'activity-not-found'};
 const access=await formForUser(user,r.rows[0].form_id);
 if(access.kind!=='ok')return access;
 return {kind:'ok',activity:r.rows[0],form:access.form};
}
function activityAccessFailure(res,access){
 if(access.kind==='activity-not-found')return fail(res,404,'Actividad no encontrada');
 return formAccessFailure(res,access);
}
function validMonth(v){return /^\d{4}-(0[1-9]|1[0-2])$/.test(v||'')}
app.get('/api/health',asyncRoute(async(_req,res)=>{await query('select 1');res.json({status:'ok',database:'connected'})}));
app.post('/api/auth/login',authLimit,asyncRoute(async(req,res)=>{const {email,password}=req.body;if(typeof email!=='string'||typeof password!=='string')return fail(res,400,'Correo y contraseña son obligatorios');const r=await query('select * from users where lower(email)=lower($1)',[email.trim()]);if(!r.rowCount||!(await bcrypt.compare(password,r.rows[0].password_hash)))return fail(res,401,'Correo o contraseña incorrectos');if(!r.rows[0].active)return fail(res,403,'Tu cuenta está desactivada. Comunícate con el administrador.');const user=userSafe(r.rows[0]);const token=jwt.sign({...user,passwordVersion:r.rows[0].password_version},process.env.JWT_SECRET,{expiresIn:'30m',algorithm:'HS256'});res.cookie('contaimp_session',token,{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',maxAge:30*60*1000,path:'/'});res.json({user})}));
// HU-06: recuperación con enlace temporal de un solo uso; nunca se devuelve el token por API.
const resetLimit=rateLimit({windowMs:15*60*1000,limit:5,standardHeaders:'draft-7',legacyHeaders:false});
const resetMessage='Si el correo corresponde a una cuenta activa, recibirás las instrucciones para recuperar tu contraseña.';
const hasMailConfig=()=>['SMTP_HOST','SMTP_PORT','SMTP_USER','SMTP_PASSWORD','MAIL_FROM','PUBLIC_WEB_URL'].every(k=>Boolean(process.env[k]));
app.post('/api/auth/forgot-password',resetLimit,asyncRoute(async(req,res)=>{
 const email=typeof req.body.email==='string'?req.body.email.trim().toLowerCase():'';
 if(!email||email.length>254||!/^\S+@\S+\.\S+$/.test(email))return fail(res,400,'Ingresa un correo válido');
 if(!hasMailConfig())return fail(res,503,'La recuperación por correo aún no está configurada. Comunícate con el administrador.');
 const found=await query('select id,email from users where lower(email)=$1 and active=true',[email]);
 if(!found.rowCount)return res.json({message:resetMessage});
 const token=crypto.randomBytes(32).toString('hex');
 const hash=crypto.createHash('sha256').update(token).digest('hex');
 const user=found.rows[0];
 await query(`insert into password_reset_tokens(user_id,token_hash,expires_at) values ($1,$2,now()+interval '15 minutes')`,[user.id,hash]);
 const url=new URL(process.env.PUBLIC_WEB_URL);
 url.searchParams.set('resetToken',token);
 const transport=nodemailer.createTransport({host:process.env.SMTP_HOST,port:Number(process.env.SMTP_PORT),secure:Number(process.env.SMTP_PORT)===465,auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASSWORD}});
 try{
  await transport.sendMail({from:process.env.MAIL_FROM,to:user.email,subject:'Recuperar contraseña - ContaImp',text:`Solicitaste restablecer tu contraseña de ContaImp. Abre este enlace (válido 15 minutos y una sola vez):\n${url}\n\nSi no lo solicitaste, ignora este mensaje.`});
 }catch(e){await query('delete from password_reset_tokens where token_hash=$1',[hash]);console.error('Falló el envío de recuperación:',e?.message);return fail(res,503,'No fue posible enviar el correo. Intenta más tarde.')}
 res.json({message:resetMessage});
}));
app.post('/api/auth/reset-password',resetLimit,asyncRoute(async(req,res)=>{
 const {token,password}=req.body;
 if(typeof token!=='string'||!/^[a-f0-9]{64}$/i.test(token)||typeof password!=='string'||password.length<8||password.length>128)return fail(res,400,'Enlace inválido o contraseña demasiado corta (mínimo 8 caracteres)');
 const hash=crypto.createHash('sha256').update(token).digest('hex');
 const client=await pool.connect();
 try{
  await client.query('BEGIN');
  const r=await client.query('select id,user_id from password_reset_tokens where token_hash=$1 and used_at is null and expires_at>now() for update',[hash]);
  if(!r.rowCount){await client.query('ROLLBACK');return fail(res,400,'El enlace venció o ya fue utilizado')}
  const passwordHash=await bcrypt.hash(password,12);
  await client.query('update users set password_hash=$1,password_version=password_version+1 where id=$2 and active=true',[passwordHash,r.rows[0].user_id]);
  await client.query('update password_reset_tokens set used_at=now() where user_id=$1 and used_at is null',[r.rows[0].user_id]);
  await client.query('COMMIT');
  res.clearCookie('contaimp_session',{path:'/'});
  res.json({message:'Contraseña actualizada. Ahora puedes iniciar sesión.'});
 }catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
}));
app.get('/api/auth/me',auth,asyncRoute(async(req,res)=>{const r=await query('select id,name,email,role from users where id=$1 and active=true',[req.user.id]);if(!r.rowCount)return fail(res,401,'Cuenta inactiva');res.json({user:r.rows[0]})}));
app.post('/api/auth/logout',(_req,res)=>{res.clearCookie('contaimp_session',{path:'/'});res.json({ok:true})});
app.use('/api',auth);
app.get('/api/companies',asyncRoute(async(req,res)=>{const r=req.user.role==='administrador'?await query('select id,name from companies order by name'):await query('select c.id,c.name from companies c join user_company uc on uc.company_id=c.id where uc.user_id=$1 order by c.name',[req.user.id]);res.json({companies:r.rows})}));
app.get('/api/templates',asyncRoute(async(_req,res)=>{const r=await query('select id,code,name from templates order by name');res.json({templates:r.rows})}));
app.get('/api/templates/:code/activities',asyncRoute(async(req,res)=>{
 const r=await query(`
  select t.id,t.code,t.name,
    coalesce(
      json_agg(json_build_object('description',ta.description,'position',ta.position) order by ta.position,ta.id)
        filter(where ta.id is not null),
      '[]'::json
    ) as activities
  from templates t
  left join template_activities ta on ta.template_id=t.id
  where t.code=$1
  group by t.id
 `,[req.params.code]);
 if(!r.rowCount)return fail(res,404,'Plantilla no encontrada');
 const {activities,...template}=r.rows[0];res.json({template,activities});
}));
app.get('/api/forms',asyncRoute(async(req,res)=>{const {companyId,period}=req.query;if(!companyId||!validMonth(period))return fail(res,400,'Empresa y período son necesarios');if(!(await canAccess(req.user,companyId)))return fail(res,403,'No tienes acceso a esta empresa');const r=await query(`select f.id,t.name as template_name,p.month as period_month,p.status as period_status from forms f join templates t on t.id=f.template_id join periods p on p.id=f.period_id where f.company_id=$1 and p.month=$2 order by f.created_at desc`,[companyId,period]);res.json({forms:r.rows})}));
// HU-04: estado consolidado de los controles para el administrador.
app.get('/api/review',asyncRoute(async(req,res)=>{
 if(req.user.role!=='administrador')return fail(res,403,'Solo el administrador puede supervisar controles');
 const {companyId,period}=req.query;
 if(!companyId||!validMonth(period))return fail(res,400,'Empresa y período son necesarios');
 const r=await query(`select f.id,t.name as template_name,p.month as period_month,p.status as period_status,
   count(a.id) filter(where a.hidden=false)::int as total,
   count(a.id) filter(where a.hidden=false and a.verified=true)::int as completed,
   count(a.id) filter(where a.hidden=false and a.verified=false)::int as pending,
   count(a.id) filter(where a.hidden=false and nullif(trim(a.note),'') is not null)::int as observations
  from forms f join templates t on t.id=f.template_id join periods p on p.id=f.period_id
  left join activities a on a.form_id=f.id
  where f.company_id=$1 and p.month=$2
  group by f.id,t.name,p.month,p.status order by t.name`,[companyId,period]);
 res.json({controls:r.rows.map(row=>({...row,progress:row.total?Math.round(100*row.completed/row.total):0}))});
}));
app.post('/api/forms',asyncRoute(async(req,res)=>{if(req.user.role!=='contador')return fail(res,403,'Solo el contador puede crear controles');const {companyId,period,template}=req.body;if(!companyId||!validMonth(period)||typeof template!=='string')return fail(res,400,'Empresa, período y plantilla requeridos');if(!(await canAccess(req.user,companyId)))return fail(res,403,'Empresa no autorizada');const client=await pool.connect();try{await client.query('BEGIN');const p=await client.query('select id,status from periods where company_id=$1 and month=$2 for update',[companyId,period]);if(!p.rowCount){await client.query('ROLLBACK');return fail(res,409,'El administrador debe abrir primero el período')};if(p.rows[0].status!=='abierto'){await client.query('ROLLBACK');return fail(res,409,'Período cerrado')};const t=await client.query('select id from templates where code=$1',[template]);if(!t.rowCount){await client.query('ROLLBACK');return fail(res,400,'Plantilla desconocida')};const existing=await client.query('select id from forms where period_id=$1 and template_id=$2',[p.rows[0].id,t.rows[0].id]);if(existing.rowCount){await client.query('ROLLBACK');return fail(res,409,'Este formulario ya existe para el período')};const f=await client.query('insert into forms(company_id,period_id,template_id,created_by) values ($1,$2,$3,$4) returning id',[companyId,p.rows[0].id,t.rows[0].id,req.user.id]);await client.query('insert into activities(form_id,description,position) select $1,description,position from template_activities where template_id=$2 order by position',[f.rows[0].id,t.rows[0].id]);await client.query('COMMIT');res.status(201).json({form:f.rows[0]})}catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}}));
app.get('/api/forms/:id',asyncRoute(async(req,res)=>{
 const access=await formForUser(req.user,req.params.id);
 if(access.kind!=='ok')return formAccessFailure(res,access);
 const activities=await query('select id,description,verified,hidden,note,due_date,position from activities where form_id=$1 order by position,id',[access.form.id]);
 res.json({form:{...access.form,activities:activities.rows}});
}));
app.get('/api/activities/:id/observation',asyncRoute(async(req,res)=>{
 const access=await activityForUser(req.user,req.params.id);
 if(access.kind!=='ok')return activityAccessFailure(res,access);
 res.json({observation:{activity_id:access.activity.id,note:access.activity.note}});
}));
app.put('/api/activities/:id/observation',asyncRoute(async(req,res)=>{
 if(!['contador','administrador'].includes(req.user.role))return fail(res,403,'El cliente solo puede consultar observaciones');
 const access=await activityForUser(req.user,req.params.id);
 if(access.kind!=='ok')return activityAccessFailure(res,access);
 const note=req.body.note;
 if(typeof note!=='string'||!note.trim()||note.length>2000)return fail(res,400,'La observación es obligatoria y no debe exceder 2000 caracteres');
 if(access.form.period_status!=='abierto')return fail(res,409,'Período cerrado');
 const r=await query('update activities set note=$1 where id=$2 returning id,note',[note.trim(),access.activity.id]);
 res.json({observation:{activity_id:r.rows[0].id,note:r.rows[0].note}});
}));
app.delete('/api/activities/:id/observation',asyncRoute(async(req,res)=>{
 if(!['contador','administrador'].includes(req.user.role))return fail(res,403,'El cliente solo puede consultar observaciones');
 const access=await activityForUser(req.user,req.params.id);
 if(access.kind!=='ok')return activityAccessFailure(res,access);
 if(access.form.period_status!=='abierto')return fail(res,409,'Período cerrado');
 const r=await query("update activities set note='' where id=$1 returning id,note",[access.activity.id]);
 res.json({observation:{activity_id:r.rows[0].id,note:r.rows[0].note}});
}));
app.post('/api/forms/:id/activities',asyncRoute(async(req,res)=>{if(req.user.role!=='contador')return fail(res,403,'Solo el contador puede editar controles');const access=await formForUser(req.user,req.params.id);if(access.kind!=='ok')return formAccessFailure(res,access);const form=access.form;if(form.period_status!=='abierto')return fail(res,409,'Período cerrado');const description=req.body.description;if(typeof description!=='string'||!description.trim()||description.length>250)return fail(res,400,'Descripción inválida');const r=await query('insert into activities(form_id,description,position) values ($1,$2,(select coalesce(max(position),0)+1 from activities where form_id=$1)) returning id',[form.id,description.trim()]);res.status(201).json({activity:r.rows[0]})}));
app.patch('/api/activities/:id',asyncRoute(async(req,res)=>{if(req.user.role!=='contador')return fail(res,403,'Solo el contador puede editar controles');const a=await query('select form_id from activities where id=$1',[req.params.id]);if(!a.rowCount)return fail(res,404,'Actividad no encontrada');const access=await formForUser(req.user,a.rows[0].form_id);if(access.kind!=='ok')return formAccessFailure(res,access);const form=access.form;if(form.period_status!=='abierto')return fail(res,409,'Período cerrado');const allowed={description:'description',verified:'verified',hidden:'hidden',note:'note',dueDate:'due_date'};const entries=Object.entries(req.body).filter(([k])=>allowed[k]);if(!entries.length)return fail(res,400,'Sin cambios válidos');for(const [k,v] of entries){if((k==='verified'||k==='hidden')&&typeof v!=='boolean')return fail(res,400,'Valor booleano inválido');if(k==='description'&&(typeof v!=='string'||!v.trim()||v.length>250))return fail(res,400,'Descripción inválida');if(k==='note'&&(typeof v!=='string'||v.length>2000))return fail(res,400,'Observación inválida');if(k==='dueDate'&&v!==null&&(!/^\d{4}-\d{2}-\d{2}$/.test(v)))return fail(res,400,'Fecha inválida')}
 const assigns=entries.map(([k],i)=>`${allowed[k]}=$${i+1}`).join(',');const values=entries.map(([k,v])=>k==='description'?v.trim():v);const r=await query(`update activities set ${assigns} where id=$${values.length+1} returning id`,[...values,req.params.id]);res.json({activity:r.rows[0]})}));
// Módulos del Administrador: usuarios, períodos, empresas y bitácora.
// Las escrituras se autorizan en el servidor, nunca solo en la interfaz.
const adminOnly=(req,res,next)=>req.user.role==='administrador'?next():fail(res,403,'Solo el administrador puede realizar esta operación');
const audit=async(actor,entity,entityId,action,details={})=>query('insert into audit_log(actor,entity,entity_id,action,details) values ($1,$2,$3,$4,$5)',[actor,entity,entityId,action,JSON.stringify(details)]);
app.get('/api/admin/users',adminOnly,asyncRoute(async(_req,res)=>{
 const r=await query(`select u.id,u.name,u.email,u.role,u.active,u.created_at,coalesce(array_agg(uc.company_id::text) filter(where uc.company_id is not null),'{}') as company_ids from users u left join user_company uc on uc.user_id=u.id group by u.id order by u.name`);
 res.json({users:r.rows});
}));
app.post('/api/admin/users',adminOnly,asyncRoute(async(req,res)=>{
 const {name,email,password,role,companyIds=[]}=req.body;
 if(typeof name!=='string'||!name.trim()||name.length>100||typeof email!=='string'||email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||typeof password!=='string'||password.length<12||!['administrador','contador','cliente'].includes(role)||!Array.isArray(companyIds)||companyIds.some(v=>typeof v!=='string'))return fail(res,400,'Revisa nombre, correo, rol y contraseña (mínimo 12 caracteres).');
 const client=await pool.connect();try{await client.query('BEGIN');const hash=await bcrypt.hash(password,12);
 const r=await client.query('insert into users(name,email,password_hash,role) values ($1,$2,$3,$4) returning id,name,email,role,active',[name.trim(),email.trim().toLowerCase(),hash,role]);
 for(const companyId of [...new Set(companyIds)])await client.query('insert into user_company(user_id,company_id) values($1,$2)',[r.rows[0].id,companyId]);
 await client.query('insert into audit_log(actor,entity,entity_id,action,details) values ($1,$2,$3,$4,$5)',[req.user.id,'users',r.rows[0].id,'crear',JSON.stringify({email:r.rows[0].email,role})]);
 await client.query('COMMIT');res.status(201).json({user:r.rows[0]});
 }catch(e){await client.query('ROLLBACK');if(e.code==='23505')return fail(res,409,'El correo ya existe');if(e.code==='23503'||e.code==='22P02')return fail(res,400,'Empresa inválida');throw e}finally{client.release()}
}));
app.patch('/api/admin/users/:id',adminOnly,asyncRoute(async(req,res)=>{
 const {name,role,active,companyIds}=req.body;
 if(name!==undefined&&(typeof name!=='string'||!name.trim()||name.length>100))return fail(res,400,'Nombre inválido');
 if(role!==undefined&&!['administrador','contador','cliente'].includes(role))return fail(res,400,'Rol inválido');
 if(active!==undefined&&typeof active!=='boolean')return fail(res,400,'Estado inválido');
 if(companyIds!==undefined&&(!Array.isArray(companyIds)||companyIds.some(v=>typeof v!=='string')))return fail(res,400,'Empresas inválidas');
 if(req.user.id===req.params.id&&(role&&role!=='administrador'||active===false))return fail(res,409,'No puedes quitar tus propios permisos de administrador');
 const client=await pool.connect();try{await client.query('BEGIN');
 const r=await client.query('update users set name=coalesce($1,name),role=coalesce($2,role),active=coalesce($3,active),password_version=password_version+1 where id=$4 returning id,name,email,role,active',[name?.trim()??null,role??null,active??null,req.params.id]);
 if(!r.rowCount){await client.query('ROLLBACK');return fail(res,404,'Usuario no encontrado')}
 if(companyIds!==undefined){await client.query('delete from user_company where user_id=$1',[req.params.id]);for(const id of [...new Set(companyIds)])await client.query('insert into user_company(user_id,company_id) values($1,$2)',[req.params.id,id])}
 await client.query('insert into audit_log(actor,entity,entity_id,action,details) values($1,$2,$3,$4,$5)',[req.user.id,'users',req.params.id,'actualizar',JSON.stringify({name,role,active,companyIds})]);
 await client.query('COMMIT');res.json({user:r.rows[0]});
 }catch(e){await client.query('ROLLBACK');if(e.code==='23503'||e.code==='22P02')return fail(res,400,'Empresa inválida');throw e}finally{client.release()}
}));
app.get('/api/admin/periods',adminOnly,asyncRoute(async(req,res)=>{
 const r=await query(`select p.id,p.month,p.status,p.company_id,c.name as company_name,p.closed_at,cu.name as closed_by_name,coalesce(count(distinct f.id),0)::int as form_count,coalesce(count(a.id) filter(where a.hidden=false),0)::int as total,coalesce(count(a.id) filter(where a.hidden=false and a.verified),0)::int as completed from periods p join companies c on c.id=p.company_id left join users cu on cu.id=p.closed_by left join forms f on f.period_id=p.id left join activities a on a.form_id=f.id where ($1::text is null or p.company_id::text=$1) group by p.id,c.name,cu.name order by p.month desc,c.name`,[req.query.companyId||null]);
 res.json({periods:r.rows});
}));
app.post('/api/admin/periods',adminOnly,asyncRoute(async(req,res)=>{
 const {companyId,month}=req.body;if(typeof companyId!=='string'||!validMonth(month))return fail(res,400,'Empresa y mes válidos requeridos');
 const r=await query('insert into periods(company_id,month,status) values($1,$2,$3) on conflict(company_id,month) do nothing returning id',[companyId,month,'abierto']);
 if(!r.rowCount)return fail(res,409,'Este período ya existe');await audit(req.user.id,'periods',r.rows[0].id,'abrir',{companyId,month});res.status(201).json({period:r.rows[0]});
}));
app.patch('/api/admin/periods/:id',adminOnly,asyncRoute(async(req,res)=>{
 const {status,confirmClose}=req.body;if(!['abierto','cerrado'].includes(status))return fail(res,400,'Estado inválido');
 if(status==='cerrado'&&confirmClose!==true)return fail(res,400,'Debes confirmar el cierre del período');
 const client=await pool.connect();try{await client.query('BEGIN');const old=await client.query('select id,status,company_id,month from periods where id=$1 for update',[req.params.id]);
 if(!old.rowCount){await client.query('ROLLBACK');return fail(res,404,'Período no encontrado')}
 if(status==='cerrado'){const pending=await client.query('select count(*)::int as n from activities a join forms f on f.id=a.form_id where f.period_id=$1 and a.hidden=false and a.verified=false',[req.params.id]);if(pending.rows[0].n){await client.query('ROLLBACK');return fail(res,409,`No se puede cerrar: ${pending.rows[0].n} actividad(es) pendiente(s).`)}}
 const r=await client.query('update periods set status=$1,closed_by=$2,closed_at=case when $1=$3 then now() else null end where id=$4 returning id,status',[status,status==='cerrado'?req.user.id:null,'cerrado',req.params.id]);
 await client.query('insert into audit_log(actor,entity,entity_id,action,details) values($1,$2,$3,$4,$5)',[req.user.id,'periods',req.params.id,status==='cerrado'?'cerrar':'reabrir',JSON.stringify({month:old.rows[0].month,previous:old.rows[0].status})]);
 await client.query('COMMIT');res.json({period:r.rows[0]});
 }catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
}));
app.get('/api/admin/history',adminOnly,asyncRoute(async(req,res)=>{
 const limit=Math.min(Math.max(Number(req.query.limit)||100,1),200);
 const r=await query('select a.id,a.entity,a.action,a.changed_at,a.details,u.name as actor_name from audit_log a left join users u on u.id=a.actor order by a.changed_at desc limit $1',[limit]);res.json({history:r.rows});
}));
app.post('/api/admin/companies',adminOnly,asyncRoute(async(req,res)=>{
 const name=req.body.name;if(typeof name!=='string'||!name.trim()||name.length>150)return fail(res,400,'Nombre de empresa inválido');
 try{const r=await query('insert into companies(name) values($1) returning id,name',[name.trim()]);await audit(req.user.id,'companies',r.rows[0].id,'crear',{name:r.rows[0].name});res.status(201).json({company:r.rows[0]})}catch(e){if(e.code==='23505')return fail(res,409,'La empresa ya existe');throw e}
}));
app.use((err,_req,res,_next)=>{console.error(err);res.status(500).json({error:'Error interno del servidor'})});
// Vercel detecta el export por defecto y ejecuta Express como función.
// En desarrollo local conservamos el puerto 4000.
export default app;
if (!process.env.VERCEL) {
 const port=Number(process.env.PORT||4000);
 app.listen(port,()=>console.log(`ContaImp API: http://localhost:${port}`));
}
