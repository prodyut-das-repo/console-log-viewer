import type { HarParam } from "../../types";
export default function HarParams({
  title,
  params,
}: {
  title: string;
  params: HarParam[];
}) {
  return (
    <>
      <h3>{title}</h3>
      <div className="har-headers">
        {params.map((param, index) => (
          <div key={`${param.name}-${index}`}>
            <b>{param.name}</b>
            <span>{param.value}</span>
          </div>
        ))}
      </div>
    </>
  );
}
