import { useEffect, useState } from "react";
import { getBlob } from "@/lib/desk/idb";
import { keyPaper } from "@/lib/desk/images";

export function useResolvedSrc(src: string | null): string {
  const [url, setUrl] = useState(src && !src.startsWith("idb:") ? src : "");
  useEffect(() => {
    if (!src) {
      setUrl("");
      return;
    }
    if (!src.startsWith("idb:")) {
      setUrl(src);
      return;
    }
    let revoked = "";
    let cancel = false;
    void getBlob(src.slice(4)).then((blob) => {
      if (!blob || cancel) return;
      revoked = URL.createObjectURL(blob);
      setUrl(revoked);
    });
    return () => {
      cancel = true;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [src]);
  return url;
}

export function useCutout(src: string | null): string {
  const url = useResolvedSrc(src);
  const [cut, setCut] = useState("");
  useEffect(() => {
    if (!url) {
      setCut("");
      return;
    }
    let cancel = false;
    void keyPaper(url).then((png) => {
      if (!cancel) setCut(png);
    });
    return () => {
      cancel = true;
    };
  }, [url]);
  return cut;
}
