// The Credits view: the owner's attribution fragment, then the fact-check's own
// method and the sources it rests on.
//
// One renderer, used by the static site and by the single-file bundle, so the
// two cannot drift.

export function creditsHTML({ ipHtml, resources }) {
  return `
    <section class="card">
      <h2>Attribution</h2>
      ${ipHtml || '<p class="placeholder">Attribution fragment not loaded.</p>'}
    </section>
    ${methodSection(resources)}
    ${sourcesSection(resources)}`;
}

function methodSection(data) {
  if (!data?.method) return '';
  const m = data.method;
  return `
    <section class="card">
      <h2>How these answers were checked</h2>
      <p class="muted small">Verification pass of ${escape(m.date)}.</p>
      <ol class="method-steps small">${m.steps.map((s) => `<li>${escape(s)}</li>`).join('')}</ol>
      <h3>Sourcing rule</h3>
      <p class="small">${escape(m.sourcing_rule)}</p>
      <h3>What could not be settled</h3>
      <p class="muted small">Recorded rather than filled. No question rests on any of these.</p>
      <ul class="gap-list small">${m.unresolved.map((s) => `<li>${escape(s)}</li>`).join('')}</ul>
    </section>`;
}

function sourcesSection(data) {
  if (!data?.groups) return '';
  const total = data.groups.reduce((n, g) => n + g.sources.length, 0);
  return `
    <section class="card">
      <h2>Sources consulted</h2>
      <p class="muted small">${escape(data.note)} Last verified ${escape(data.verified_on)} —
        ${total} sources.</p>
      ${data.groups.map((group) => `
        <div class="source-group">
          <h3>${escape(group.publisher)}</h3>
          <ul class="source-list">${group.sources.map((s) => `
            <li>
              <a href="${escape(s.url)}" target="_blank" rel="noopener">${escape(s.cite)}</a>
              <span class="source-meta">
                ${s.effective ? `in force ${escape(s.effective)}` : 'consulted'}
                ${s.cited_by ? `<span class="cited">${s.cited_by} q</span>` : ''}
              </span>
            </li>`).join('')}
          </ul>
        </div>`).join('')}
    </section>`;
}

function escape(text) {
  return String(text).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
