import { messages } from "../i18n";
import type { Locale } from "../i18n";

export function ExplorerFooter({ locale }: { locale: Locale }) {
  const text = messages[locale];

  return (
    <footer className="site-footer">
      <div className="privacy-strip">
        <span aria-hidden="true">ⓘ</span>
        <p>{text.privacy}</p>
      </div>
      <div className="footer-main">
        <p>© 2026 Markellos Markides. All rights reserved.</p>
        <nav aria-label={text.footerNavigation}>
          <a href="https://markellosecosystem.com/">{text.ecosystem}</a>
        </nav>
        <small>{__BUILD_VERSION__}</small>
      </div>
    </footer>
  );
}
