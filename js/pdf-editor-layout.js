export function mountPdfEditor(view) {
  view.innerHTML = `
          <div class="pdf-tools">
            <button id="pdf-native" type="button">Show notation</button>
            <label>Page <select id="pdf-page"></select></label>
            <button id="pdf-map" type="button" aria-pressed="false">Mark measures</button>
            <span id="pdf-edit" hidden><label><span id="pdf-number-label">Measure</span> <select id="pdf-measure"></select></label>
              <button id="pdf-remove" type="button">Remove box</button>
              <button id="pdf-find" type="button">Find boxes on page</button>
              <span id="pdf-review" hidden><label>Correction <select id="pdf-action">
                <option value="draw">Draw or redraw</option><option value="split">Split at click</option>
                <option value="join">Join with next</option><option value="remove">Remove extra</option>
              </select></label>
              <label id="pdf-replace-label" hidden><input id="pdf-replace" type="checkbox"> Replace saved boxes on this page</label>
              <button id="pdf-use" type="button">Use page boxes</button><button id="pdf-cancel" type="button">Cancel</button></span></span>
            <label id="pdf-position" hidden>Jump to <select id="pdf-note"></select></label>
            <span id="pdf-target"></span>
          </div>
          <p id="pdf-status" role="status" hidden></p>
          <div id="pdf-scroll" tabindex="0" aria-label="PDF page">
            <div id="pdf-sheet"><canvas id="pdf-canvas" aria-label="Printed score page"></canvas><div id="pdf-boxes"></div></div>
          </div>`;
}
