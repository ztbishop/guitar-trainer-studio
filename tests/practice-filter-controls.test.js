import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../js/app-bootstrap.js',import.meta.url),'utf8');
for(const [control,property] of [['spikeFilter','filterHexSpikes'],['rangeFilter','filterScoreRange']]) {
  test(`${property} saves both click directions despite synchronous stop repaint`,()=>{
    const pattern=new RegExp(control+"\\??\\.addEventListener\\('change',\\(\\)=>\\{([\\s\\S]*?)\\n  \\}\\);");
    const body=source.match(pattern)?.[1];assert.ok(body,'actual change handler found');
    for(const previous of [true,false]) {
      const state={[property]:previous},input={checked:!previous};let saved;
      const repaint=()=>{input.checked=state[property];};
      const context=vm.createContext({AppState:state,[control]:input,
        waitController:{stop:repaint},pauseWaitTransport:repaint,clearActiveMidiNotes(){},
        resetRealtimeSession(){},savePracticePreferences(s){saved=s[property]},configureWaitSession:repaint,renderTrainerUi:repaint});
      vm.runInContext(body,context);
      assert.equal(state[property],!previous);assert.equal(saved,!previous);assert.equal(input.checked,!previous);
    }
  });
}
