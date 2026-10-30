import { memo } from "react";
import { useTranslation } from "../../i18n/LanguageProvider";
import { useState } from "react";
import type { HarEntry, HarDetailTab } from "../../types";
import { formatDuration } from "../../utils/format";
import { prettifyHarBody } from "../../utils/har";
import HarHeaders from "./HarHeaders";
import HarParams from "./HarParams";
import HarTiming from "./HarTiming";
function HarRequestDetails({ entry: selectedHarEntry }: { entry: HarEntry }) {
  const { t } = useTranslation();
  const [harDetailTab, setHarDetailTab] = useState<HarDetailTab>("overview");
  return (
    <div className="har-detail">
      <div className="har-detail-title">
        <div>
          <span className="har-method large">
            {selectedHarEntry.request.method}
          </span>
          <h2 title={selectedHarEntry.request.url}>
            {selectedHarEntry.request.url}
          </h2>
        </div>
        <span
          className={
            "har-status-pill" +
            (selectedHarEntry.response.status >= 400
              ? " bad"
              : selectedHarEntry.response.status >= 300
                ? " redirect"
                : "")
          }
        >
          {selectedHarEntry.response.status}{" "}
          {selectedHarEntry.response.statusText}
        </span>
      </div>
      <nav className="har-detail-tabs" aria-label={t("Request details")}>
        {(["overview", "request", "response", "timing"] as HarDetailTab[]).map(
          (tab) => (
            <button
              className={harDetailTab === tab ? "active" : ""}
              key={tab}
              onClick={() => setHarDetailTab(tab)}
              type="button"
            >
              {t(tab[0].toUpperCase() + tab.slice(1))}
            </button>
          ),
        )}
      </nav>
      <div className="har-detail-content">
        {harDetailTab === "overview" && (
          <>
            <h3>{t("General")}</h3>
            <dl className="har-kv">
              <dt>{t("Request URL")}</dt>
              <dd>{selectedHarEntry.request.url}</dd>
              <dt>{t("Request method")}</dt>
              <dd>{selectedHarEntry.request.method}</dd>
              <dt>{t("Status code")}</dt>
              <dd>
                {selectedHarEntry.response.status}{" "}
                {selectedHarEntry.response.statusText}
              </dd>
              <dt>{t("HTTP version")}</dt>
              <dd>{selectedHarEntry.response.httpVersion || "—"}</dd>
              <dt>{t("Started")}</dt>
              <dd>
                {selectedHarEntry.startedDateTime
                  ? new Date(selectedHarEntry.startedDateTime).toLocaleString()
                  : "—"}
              </dd>
              <dt>{t("Resource type")}</dt>
              <dd>
                {selectedHarEntry._resourceType ||
                  selectedHarEntry.response.content?.mimeType ||
                  "—"}
              </dd>
              <dt>{t("Remote address")}</dt>
              <dd>{selectedHarEntry.serverIPAddress || "—"}</dd>
              <dt>{t("Duration")}</dt>
              <dd>{formatDuration(selectedHarEntry.time ?? 0)}</dd>
            </dl>
          </>
        )}
        {harDetailTab === "request" && (
          <>
            <HarHeaders
              title={t("Request headers")}
              headers={selectedHarEntry.request.headers}
              emptyText={t("No headers in this capture.")}
            />
            {(selectedHarEntry.request.queryString?.length ?? 0) > 0 && (
              <HarParams
                title={t("Query parameters")}
                params={selectedHarEntry.request.queryString ?? []}
              />
            )}
            {selectedHarEntry.request.postData?.text && (
              <>
                <h3>
                  {t("Request payload")}{" "}
                  <span>{selectedHarEntry.request.postData.mimeType}</span>
                </h3>
                <pre className="har-body">
                  {prettifyHarBody(
                    selectedHarEntry.request.postData.text,
                    selectedHarEntry.request.postData.mimeType,
                  )}
                </pre>
              </>
            )}
          </>
        )}
        {harDetailTab === "response" && (
          <>
            <HarHeaders
              title={t("Response headers")}
              headers={selectedHarEntry.response.headers}
              emptyText={t("No headers in this capture.")}
            />
            <h3>
              {t("Response body")}{" "}
              <span>
                {selectedHarEntry.response.content?.mimeType ||
                  t("Unknown type")}
              </span>
            </h3>
            {selectedHarEntry.response.content?.text ? (
              <pre className="har-body">
                {selectedHarEntry.response.content.encoding === "base64"
                  ? `[Base64 encoded content]\n${selectedHarEntry.response.content.text}`
                  : prettifyHarBody(
                      selectedHarEntry.response.content.text,
                      selectedHarEntry.response.content.mimeType,
                    )}
              </pre>
            ) : (
              <p className="har-muted">
                {t("No response body was included in this capture.")}
              </p>
            )}
          </>
        )}
        {harDetailTab === "timing" && <HarTiming entry={selectedHarEntry} />}
      </div>
    </div>
  );
}

export default memo(HarRequestDetails);
