import { AppHero } from '@/components/app-hero'
import { FavoritesAdvanced } from '@/components/favorites/favorites-advanced'

const links: { label: string; href: string }[] = [
  { label: 'Solana Docs', href: 'https://docs.solana.com/' },
  { label: 'Solana Faucet', href: 'https://faucet.solana.com/' },
  { label: 'Solana Cookbook', href: 'https://solana.com/developers/cookbook/' },
  { label: 'Solana Stack Overflow', href: 'https://solana.stackexchange.com/' },
  { label: 'Solana Developers GitHub', href: 'https://github.com/solana-developers/' },
]

export function DashboardFeature() {
  return (
    <div>
      <AppHero title="gm" subtitle="Say hi to your new Solana app." />
      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Favorites 组件 */}
          <div>
            <FavoritesAdvanced />
          </div>
          
          {/* 原有的链接 */}
          <div className="text-center">
            <div className="space-y-2">
              <p>Here are some helpful links to get you started.</p>
              {links.map((link, index) => (
                <div key={index}>
                  <a
                    href={link.href}
                    className="hover:text-gray-500 dark:hover:text-gray-300"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {link.label}
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
