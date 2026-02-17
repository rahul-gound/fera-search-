import type { Infobox as InfoboxType } from "../lib/types";

interface Props {
  infobox: InfoboxType;
}

export default function Infobox({ infobox }: Props) {
  return (
    <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
      <div className="flex gap-4">
        {infobox.img_src && (
          <img
            src={infobox.img_src}
            alt={infobox.infobox}
            className="w-16 h-16 rounded-xl object-cover flex-shrink-0 bg-gray-100 dark:bg-gray-800"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        )}
        <div className="min-w-0">
          <h3 className="font-semibold text-base leading-snug">
            {infobox.infobox}
          </h3>
          {infobox.content && (
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-4">
              {infobox.content}
            </p>
          )}
        </div>
      </div>
      {infobox.urls && infobox.urls.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {infobox.urls.slice(0, 4).map((link, i) => (
            <a
              key={i}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline underline-offset-2"
            >
              {link.title}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
