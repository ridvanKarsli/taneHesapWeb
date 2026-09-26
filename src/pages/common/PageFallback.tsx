/** Sayfa parçası indirilirken gösterilen iskelet (veri yüklenirken görünenle aynı, sayfa zıplamaz). */
export function PageFallback() {
  return (
    <div className="ui-skeleton" aria-label="Yükleniyor">
      <span />
      <span />
      <span />
    </div>
  );
}
