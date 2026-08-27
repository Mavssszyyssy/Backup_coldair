import { Snowflake } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../../config/api";

const resolveImageUrl = (value = "") => {
  const source = String(value || "").trim();
  if (!source) return "";
  if (/^https?:\/\//i.test(source) || source.startsWith("data:")) return source;
  const apiOrigin = API_BASE_URL.replace(/\/api\/?$/i, "");
  return `${apiOrigin}${source.startsWith("/") ? source : `/${source}`}`;
};

function UnitProductVisual({ unit, size = "card" }) {
  const imageUrl = useMemo(
    () => resolveImageUrl(unit?.imageUrl || unit?.image),
    [unit?.imageUrl, unit?.image],
  );
  const [broken, setBroken] = useState(false);

  useEffect(() => setBroken(false), [imageUrl]);

  return (
    <div className={`unit-product-visual unit-product-visual--${size}`}>
      <span className="unit-product-orbit" aria-hidden="true" />
      {imageUrl && !broken ? (
        <img
          src={imageUrl}
          alt={`${unit?.brand || "AC"} ${unit?.productSku || unit?.model || "unit"}`}
          loading="lazy"
          onError={() => setBroken(true)}
        />
      ) : (
        <span className="unit-product-fallback" aria-label="AC product image unavailable">
          <Snowflake size={size === "modal" ? 72 : 48} weight="duotone" />
        </span>
      )}
      <span className="unit-product-shadow" aria-hidden="true" />
    </div>
  );
}

export default UnitProductVisual;
