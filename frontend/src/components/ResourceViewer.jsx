import { useState } from 'react';
import { X, ZoomIn, ZoomOut, Download, ExternalLink, Loader2, AlertCircle } from 'lucide-react';
import ReactPlayer from 'react-player';
import { storageUrl } from '../config';

function fileUrl(path) {
  return storageUrl(path);
}

/* ── PDF viewer ─────────────────────────────────────────────────────────── */
function PdfViewer({ url }) {
  return (
    <div className="flex-1 bg-gray-800 flex flex-col">
      <iframe
        src={url}
        className="flex-1 w-full border-0"
        title="PDF"
        style={{ minHeight: '70vh' }}
      />
    </div>
  );
}

/* ── Image viewer ───────────────────────────────────────────────────────── */
function ImageViewer({ url }) {
  const [zoom, setZoom] = useState(1);
  return (
    <div className="flex-1 bg-gray-900 flex flex-col items-center justify-center overflow-auto relative">
      <div className="absolute top-3 right-3 flex gap-2 z-10">
        <button onClick={() => setZoom(z => Math.min(z + 0.25, 4))}
          className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white">
          <ZoomIn size={18} />
        </button>
        <button onClick={() => setZoom(z => Math.max(z - 0.25, 0.25))}
          className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white">
          <ZoomOut size={18} />
        </button>
        <span className="px-2 py-2 bg-white/10 rounded-lg text-white text-sm">
          {Math.round(zoom * 100)}%
        </span>
      </div>
      <img
        src={url}
        alt="resource"
        style={{ transform: `scale(${zoom})`, transformOrigin: 'center', transition: 'transform 0.2s' }}
        className="max-w-full max-h-full object-contain"
      />
    </div>
  );
}

/* ── Video viewer ───────────────────────────────────────────────────────── */
function VideoViewer({ url, isYoutube }) {
  if (isYoutube) {
    return (
      <div className="flex-1 bg-black flex items-center justify-center">
        <ReactPlayer url={url} controls width="100%" height="100%" style={{ minHeight: '60vh' }} />
      </div>
    );
  }
  return (
    <div className="flex-1 bg-black flex items-center justify-center">
      <video src={url} controls className="max-w-full max-h-full" style={{ minHeight: '60vh' }}>
        Votre navigateur ne supporte pas la lecture vidéo.
      </video>
    </div>
  );
}

/* ── Office files ───────────────────────────────────────────────────────── */
const OFFICE_LABELS = { pptx: 'PowerPoint', docx: 'Word', xlsx: 'Excel' };
const OFFICE_ICONS  = { pptx: '🟠', docx: '🔵', xlsx: '🟢' };

const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);

/* PPTX : Office Online embed (nécessite une URL publique) */
function PptxViewer({ url, fileName }) {
  const [loading, setLoading] = useState(true);

  if (isLocalhost) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 gap-5 p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-orange-100 flex items-center justify-center">
          <AlertCircle size={28} className="text-orange-500" />
        </div>
        <div>
          <p className="font-semibold text-gray-800 mb-1">Visualisation non disponible en local</p>
          <p className="text-sm text-gray-500 max-w-sm">
            La visualisation en ligne nécessite une URL publique.<br />
            Elle sera active une fois le site déployé en production.
          </p>
        </div>
        <a href={url} download={fileName}
          className="flex items-center gap-2 bg-orange-500 text-white px-6 py-3 rounded-xl hover:bg-orange-600 font-medium shadow-sm">
          <Download size={18} /> Télécharger le fichier
        </a>
      </div>
    );
  }

  const officeUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;

  return (
    <div className="flex-1 flex flex-col relative bg-gray-900">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
          <Loader2 size={32} className="text-white animate-spin" />
        </div>
      )}
      <iframe
        src={officeUrl}
        className="flex-1 w-full border-0"
        title={fileName}
        onLoad={() => setLoading(false)}
        style={{ minHeight: '70vh' }}
        allow="fullscreen"
      />
    </div>
  );
}

/* docx / xlsx : lien + téléchargement */
function OfficeViewer({ url, fileType, fileName }) {
  const label = OFFICE_LABELS[fileType] || 'Office';
  const icon  = OFFICE_ICONS[fileType]  || '📄';

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 gap-6 p-8">
      <div className="text-center">
        <p className="text-6xl mb-4">{icon}</p>
        <p className="font-semibold text-gray-800 text-lg mb-1">{fileName}</p>
        <p className="text-sm text-gray-500">Fichier {label}</p>
      </div>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button onClick={() => { window.location.href = `ms-${fileType === 'docx' ? 'word' : 'excel'}:ofv|u|${url}`; }}
          className="flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 font-medium shadow-sm">
          <ExternalLink size={18} /> Ouvrir dans {label}
        </button>
        <a href={url} download={fileName}
          className="flex items-center justify-center gap-2 border border-gray-300 text-gray-700 px-6 py-3 rounded-xl hover:bg-gray-100 font-medium">
          <Download size={18} /> Télécharger
        </a>
      </div>
    </div>
  );
}

/* ── Main modal ─────────────────────────────────────────────────────────── */
export default function ResourceViewer({ resource, onClose }) {
  if (!resource) return null;

  const url = resource.file_path ? fileUrl(resource.file_path) : resource.external_url;
  const ft = resource.file_type;

  const renderContent = () => {
    if (ft === 'pdf') return <PdfViewer url={url} />;
    if (ft === 'image') return <ImageViewer url={url} />;
    if (ft === 'video_upload') return <VideoViewer url={url} isYoutube={false} />;
    if (ft === 'video_youtube') return <VideoViewer url={resource.external_url} isYoutube={true} />;
    if (ft === 'link') return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-gray-50">
        <ExternalLink size={40} className="text-blue-500" />
        <a href={resource.external_url} target="_blank" rel="noreferrer"
          className="text-blue-600 hover:underline text-lg break-all max-w-lg text-center">
          {resource.external_url}
        </a>
        <a href={resource.external_url} target="_blank" rel="noreferrer"
          className="bg-blue-600 text-white px-6 py-2.5 rounded-xl hover:bg-blue-700">
          Ouvrir le lien
        </a>
      </div>
    );
    if (ft === 'pptx') return <PptxViewer url={url} fileName={resource.file_name || resource.title} />;
    if (['docx', 'xlsx'].includes(ft)) {
      return <OfficeViewer url={url} fileType={ft} fileName={resource.file_name || resource.title} />;
    }
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-gray-50">
        <p className="text-gray-500">Aperçu non disponible pour ce type de fichier.</p>
        {url && (
          <a href={url} target="_blank" rel="noreferrer"
            className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl hover:bg-indigo-700 flex items-center gap-2">
            <Download size={18} /> Télécharger
          </a>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col" onClick={e => e.target === e.currentTarget && onClose()}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-gray-900 text-white shrink-0">
        <div className="min-w-0">
          <p className="font-semibold truncate">{resource.title}</p>
          {resource.file_name && (
            <p className="text-xs text-gray-400 truncate">{resource.file_name}</p>
          )}
        </div>
        <div className="flex items-center gap-2 ml-4 shrink-0">
          {resource.file_path && (
            <a href={fileUrl(resource.file_path)} download={resource.file_name}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition">
              <Download size={18} />
            </a>
          )}
          <button onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition">
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {renderContent()}
      </div>
    </div>
  );
}
