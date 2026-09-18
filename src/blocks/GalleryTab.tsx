import { filenameFromURL } from "@blocknote/core";
import { createContext, useContext, useEffect, useState } from "react";
import bundledGalleryUrl from "../data/gallery.json?url";
import "./gallery.css";

export const GalleryUrlContext = createContext<string | undefined>(undefined);

export type GalleryImage = {
  id?: string | number;
  url: string;
  alt?: string;
  thumbnail?: string;
};

export type GalleryVisit = {
  title?: string;
  images: GalleryImage[];
};

function asImage(item: unknown): GalleryImage | null {
  if (!item || typeof item !== "object") return null;
  const url = (item as { url?: unknown }).url;
  if (typeof url !== "string" || !url) return null;
  const thumbnail =
    (item as { thumbnail?: unknown }).thumbnail ??
    (item as { thumb?: unknown }).thumb;
  const alt = (item as { alt?: unknown }).alt;
  const id = (item as { id?: unknown }).id;
  return {
    url,
    thumbnail: typeof thumbnail === "string" ? thumbnail : undefined,
    alt: typeof alt === "string" ? alt : undefined,
    id:
      typeof id === "string" || typeof id === "number" ? id : undefined,
  };
}

function parseGallery(data: unknown): GalleryVisit[] {
  if (data && typeof data === "object" && Array.isArray((data as { visits?: unknown }).visits)) {
    return (data as { visits: unknown[] }).visits.flatMap((visit) => {
      if (!visit || typeof visit !== "object") return [];
      const images = Array.isArray((visit as { images?: unknown }).images)
        ? (visit as { images: unknown[] }).images.flatMap((item) => {
            const image = asImage(item);
            return image ? [image] : [];
          })
        : [];
      if (images.length === 0) return [];
      const title = (visit as { title?: unknown }).title;
      return [
        {
          title: typeof title === "string" ? title : undefined,
          images,
        },
      ];
    });
  }

  const items = Array.isArray(data)
    ? data
    : data &&
        typeof data === "object" &&
        Array.isArray((data as { images?: unknown }).images)
      ? (data as { images: unknown[] }).images
      : [];
  const images = items.flatMap((item) => {
    const image = asImage(item);
    return image ? [image] : [];
  });
  return images.length ? [{ images }] : [];
}

export function GalleryPicker({
  onSelect,
  url,
}: {
  onSelect: (image: GalleryImage) => void;
  url?: string;
}) {
  const contextUrl = useContext(GalleryUrlContext);
  const sourceUrl = url || contextUrl || bundledGalleryUrl;
  const [visits, setVisits] = useState<GalleryVisit[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(sourceUrl)
      .then((response) => {
        if (!response.ok) throw new Error("Failed to load gallery");
        return response.json();
      })
      .then((data: unknown) => {
        if (!cancelled) setVisits(parseGallery(data));
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [sourceUrl]);

  if (error) {
    return (
      <div className="image-gallery__status">Could not load gallery.</div>
    );
  }
  if (!visits) {
    return <div className="image-gallery__status">Loading gallery…</div>;
  }
  if (visits.length === 0) {
    return <div className="image-gallery__status">No images yet.</div>;
  }

  return (
    <div className="image-gallery">
      {visits.map((visit, index) => (
        <section
          key={visit.title || index}
          className="image-gallery__visit"
        >
          {visit.title ? (
            <h3 className="image-gallery__visit-title">{visit.title}</h3>
          ) : null}
          <div className="image-gallery__images">
            {visit.images.map((image) => (
              <button
                key={image.id ?? image.url}
                type="button"
                className="image-gallery__item"
                title={image.alt || visit.title}
                aria-label={
                  image.alt ||
                  (image.id != null ? `Image ${image.id}` : "Insert image")
                }
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onSelect(image)}
              >
                <img src={image.thumbnail || image.url} alt="" />
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function applyGalleryImage(
  editor: {
    getBlock: (id: string) => unknown;
    updateBlock: (
      id: string,
      update: { props: { name: string; url: string } },
    ) => void;
  },
  blockId: string,
  image: GalleryImage,
) {
  if (!editor.getBlock(blockId)) return;
  editor.updateBlock(blockId, {
    props: {
      name:
        image.alt ||
        (image.id != null ? String(image.id) : filenameFromURL(image.url)),
      url: image.url,
    },
  });
}
