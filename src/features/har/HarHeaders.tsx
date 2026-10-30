import type { HarHeader } from "../../types";
export default function HarHeaders({
  title,
  headers,
  emptyText,
}: {
  title: string;
  headers?: HarHeader[];
  emptyText: string;
}) {
  return (
    <>
      <h3>
        {title} <span>{headers?.length ?? 0}</span>
      </h3>
      <div className="har-headers">
        {headers?.length ? (
          headers.map((header, index) => (
            <div key={`${header.name}-${index}`}>
              <b>{header.name}</b>
              <span>{header.value}</span>
            </div>
          ))
        ) : (
          <p>{emptyText}</p>
        )}
      </div>
    </>
  );
}
