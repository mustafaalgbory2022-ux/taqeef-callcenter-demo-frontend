import { Suspense, useState } from 'react';
import { NavLink, Outlet, useSearchParams } from 'react-router';
import { useApiClient } from '@/shared/api/ApiProvider';
import { useBranding } from '@/shared/branding/BrandingProvider';
import { useI18n } from '@/shared/i18n/I18nProvider';
import { Button } from '@/shared/ui/Button';
import { DataSourceBadge } from '@/shared/ui/DataSourceBadge';
import { Icon } from '@/shared/ui/Icon';
import { LoadingState } from '@/shared/ui/States';
import { navigation } from './navigation';
import { PreferenceControls } from './PreferenceControls';
import styles from './AppShell.module.css';

export function AppShell() {
  const { t, pick } = useI18n();
  const api = useApiClient();
  const branding = useBranding();
  const [params] = useSearchParams();
  const [menuOpen, setMenuOpen] = useState(false);
  const agent = params.get('agent');

  return (
    <div className={styles.shell}>
      <a className={styles.skip} href="#main">
        {t('app.skipToContent')}
      </a>

      <div className={styles.brand}>
        <img
          className={styles.logo}
          src={branding.logoUrl}
          alt={t(branding.isPlaceholder ? 'app.logoPlaceholder' : 'app.logo')}
          width={28}
          height={28}
        />
        <div className={styles.brandText}>
          <span className={styles.org}>{pick(branding.organizationName)}</span>
          <span className={styles.product}>{pick(branding.productName)}</span>
        </div>
      </div>

      <header className={styles.header}>
        <Button
          variant="secondary"
          size="sm"
          className={styles.menuButton}
          aria-expanded={menuOpen}
          aria-controls="main-nav"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <Icon name={menuOpen ? 'close' : 'menu'} />
          {t('app.menu')}
        </Button>
        <DataSourceBadge mode={api.mode} />
        <span className={styles.spacer} />
        <span className={styles.user}>{t('session.localName')}</span>
        <PreferenceControls />
      </header>

      <nav
        id="main-nav"
        className={`${styles.nav} ${menuOpen ? styles.open : ''}`}
        aria-label={t('app.mainNav')}
      >
        {navigation.map((group) => (
          <div key={group.label} className={styles.group}>
            <p className={styles.groupLabel}>{t(group.label)}</p>
            <ul className={styles.navList}>
              {group.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={
                      item.keepAgentFilter && agent
                        ? `${item.to}?agent=${encodeURIComponent(agent)}`
                        : item.to
                    }
                    end={item.end ?? false}
                    className={styles.navLink ?? ''}
                    onClick={() => setMenuOpen(false)}
                  >
                    <Icon name={item.icon} />
                    {t(item.label)}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <main id="main" className={styles.main} tabIndex={-1}>
        <div className={styles.mainInner}>
          <Suspense fallback={<LoadingState rows={6} />}>
            <Outlet />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
