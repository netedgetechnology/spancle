'use client';

import { useState }           from 'react';
import Link                   from 'next/link';
import { MediaGrid }          from '@/components/media/media-grid';
import { AssetDetails }       from '@/components/media/asset-details';
import { RegisterAssetForm }  from '@/components/media/register-asset-form';
import type { MediaAsset }    from '@/lib/media.api';

type PanelMode = 'none' | 'detail' | 'register';

export default function SuperAdminMediaLibraryPage(): React.ReactElement {
  const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null);
  const [panelMode,     setPanelMode]     = useState<PanelMode>('none');

  const openDetail = (asset: MediaAsset) => { setSelectedAsset(asset); setPanelMode('detail'); };
  const closePanel = () => { setSelectedAsset(null); setPanelMode('none'); };
  const showPanel  = panelMode !== 'none';

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Breadcrumb + Header */}
      <div className="flex items-center justify-between gap-4 flex-shrink-0">
        <div>
          <nav className="flex items-center gap-1 text-xs text-gray-400 mb-1">
            <Link href="/website-cms" className="hover:text-gray-600 transition-colors">Website CMS</Link>
            <span>/</span>
            <span className="text-gray-600 font-medium">Media Library</span>
          </nav>
          <h2 className="text-lg font-semibold text-gray-900">Media Library</h2>
          <p className="mt-0.5 text-xs text-gray-400">Platform-wide media assets</p>
        </div>
        <button
          type="button"
          onClick={() => { setSelectedAsset(null); setPanelMode('register'); }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Register asset
        </button>
      </div>

      <div className={`flex gap-4 flex-1 min-h-0 ${showPanel ? 'lg:flex-row' : ''}`}>
        <div className={showPanel ? 'flex-1 min-w-0 overflow-y-auto' : 'w-full'}>
          <MediaGrid onOpenDetail={openDetail} />
        </div>

        {showPanel && (
          <div className="w-full lg:w-80 xl:w-96 flex-shrink-0 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            {panelMode === 'detail' && selectedAsset ? (
              <AssetDetails asset={selectedAsset} onClose={closePanel} onDeleted={closePanel} />
            ) : (
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                  <h3 className="text-sm font-semibold text-gray-900">Register asset</h3>
                  <button type="button" onClick={closePanel}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" aria-label="Close">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  <RegisterAssetForm onSuccess={closePanel} onCancel={closePanel} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
