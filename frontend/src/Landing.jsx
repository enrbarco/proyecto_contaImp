import { useLayoutEffect } from 'react';
import landingHtml from './landing/index.html?raw';
import landingCss from './landing/css/styles.css?raw';
import landingJs from './landing/js/main.js?raw';
import logoUrl from './landing/assets/img/logo.png?url';
import heroUrl from './landing/assets/img/hero.jpg?url';
import ctaUrl from './landing/assets/img/cta.jpg?url';

const bodyHtml = landingHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1]
  ?.replace(/<script[^>]*src=["']js\/main\.js["'][^>]*><\/script>/i, '')
  .replaceAll('assets/img/logo.png', logoUrl)
  .replaceAll('assets/img/hero.jpg', heroUrl)
  .replaceAll('assets/img/cta.jpg', ctaUrl) ?? '';

export default function Landing({ onLogin }) {
  useLayoutEffect(() => {
    const style = document.createElement('style');
    style.dataset.contaimpLanding = 'styles';
    style.textContent = landingCss;
    document.head.appendChild(style);

    const loginLink = document.querySelector('.nav__login');
    const openLogin = (event) => { event.preventDefault(); onLogin?.(); };
    loginLink?.addEventListener('click', openLogin);

    const script = document.createElement('script');
    script.dataset.contaimpLanding = 'behavior';
    script.textContent = landingJs;
    document.body.appendChild(script);

    return () => {
      loginLink?.removeEventListener('click', openLogin);
      window.__contaimpLandingCleanup?.();
      style.remove();
      script.remove();
      document.body.classList.remove('nav-open');
      document.documentElement.classList.remove('js');
    };
  }, [onLogin]);

  return <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />;
}
