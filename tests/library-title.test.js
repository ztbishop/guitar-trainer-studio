import test from 'node:test';
import assert from 'node:assert/strict';
import {libraryTitle} from '../js/score-library.js';
test('initial library titles fall back only for empty or untitled placeholders',()=>{
 for(const title of ['',null,'Untitled',' UNTITLED SONG '])assert.equal(libraryTitle(title,'Mary had a little lamb.gp'),'Mary had a little lamb');
 for(const title of ['Mary','Untitled Blues','Untitled song 2'])assert.equal(libraryTitle(title,'other.gp'),title);
});
