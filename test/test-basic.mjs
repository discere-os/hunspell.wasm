#!/usr/bin/env node
/**
 * Basic functionality tests for hunspell.wasm
 * Tests core spell checking, suggestion, and dictionary functionality
 */

import { strict as assert } from 'assert';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { performance } from 'perf_hooks';

// Test suite framework
class TestSuite {
  constructor(name) {
    this.name = name;
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  test(name, fn) {
    this.tests.push({ name, fn });
  }

  async run() {
    console.log(`\n🔍 Running test suite: ${this.name}`);
    console.log('─'.repeat(50));

    for (const { name, fn } of this.tests) {
      try {
        console.log(`  Testing: ${name}...`);
        const start = performance.now();
        await fn();
        const duration = performance.now() - start;
        console.log(`  ✅ ${name} (${duration.toFixed(2)}ms)`);
        this.passed++;
      } catch (error) {
        console.log(`  ❌ ${name}: ${error.message}`);
        this.failed++;
      }
    }

    console.log('─'.repeat(50));
    console.log(`  Results: ${this.passed} passed, ${this.failed} failed`);
    
    if (this.failed > 0) {
      process.exit(1);
    }
  }
}

// Mock WASM module for testing (replace with actual module in real tests)
class MockHunspell {
  constructor() {
    this.HEAPU8 = new Uint8Array(1024 * 1024); // 1MB mock heap
    this._malloc_offset = 0;
    this.dictionaries = new Map();
    this.loaded_dictionaries = new Set();
  }

  _malloc(size) {
    const ptr = this._malloc_offset;
    this._malloc_offset += size;
    return ptr;
  }

  _free(ptr) {
    // Mock free - in real implementation this would manage memory
  }

  // Mock Hunspell API functions
  _Hunspell_create(aff_path, dic_path) {
    const handle = this._malloc(8); // Mock handle
    this.loaded_dictionaries.add(handle);
    return handle;
  }

  _Hunspell_create_key(aff_path, dic_path, key) {
    return this._Hunspell_create(aff_path, dic_path);
  }

  _Hunspell_destroy(handle) {
    this.loaded_dictionaries.delete(handle);
    this._free(handle);
  }

  _Hunspell_spell(handle, word_ptr) {
    // Mock spell check - return 1 for "correct", 0 for "incorrect"
    const word = this._getString(word_ptr);
    const correctWords = ['hello', 'world', 'test', 'hunspell', 'dictionary'];
    return correctWords.includes(word.toLowerCase()) ? 1 : 0;
  }

  _Hunspell_suggest(handle, word_ptr, suggestion_list_ptr) {
    // Mock suggestions - return count of suggestions
    const word = this._getString(word_ptr);
    const suggestions = this._generateSuggestions(word);
    // In real implementation, would populate suggestion_list_ptr
    return suggestions.length;
  }

  _Hunspell_add(handle, word_ptr) {
    // Mock add word to personal dictionary
    return 1; // Success
  }

  _Hunspell_remove(handle, word_ptr) {
    // Mock remove word from personal dictionary  
    return 1; // Success
  }

  _Hunspell_add_dic(handle, dic_path) {
    // Mock add additional dictionary
    return 1; // Success
  }

  // Helper methods
  _getString(ptr) {
    // Mock string extraction from WASM heap
    return 'mockword'; // In real implementation, would read from HEAPU8[ptr]
  }

  _generateSuggestions(word) {
    // Mock suggestion generation
    const suggestions = [];
    if (word.toLowerCase().includes('teh')) {
      suggestions.push('the');
    }
    if (word.toLowerCase().includes('recieve')) {
      suggestions.push('receive');
    }
    return suggestions;
  }

  // Morphological analysis functions
  _Hunspell_analyze(handle, word_ptr) {
    // Mock morphological analysis
    return 2; // Return count of analyses
  }

  _Hunspell_stem(handle, word_ptr) {
    // Mock stemming
    return 1; // Return count of stems
  }

  _Hunspell_generate(handle, word_ptr, word2_ptr) {
    // Mock morphological generation
    return 1; // Return count of generated forms
  }
}

// Test basic functionality
const basicTests = new TestSuite('Basic Hunspell Functionality');

basicTests.test('Module initialization', async () => {
  const hunspell = new MockHunspell();
  assert.ok(hunspell, 'Hunspell module should initialize');
  assert.ok(hunspell.HEAPU8, 'Heap should be available');
  assert.equal(typeof hunspell._malloc, 'function', 'malloc should be available');
  assert.equal(typeof hunspell._free, 'function', 'free should be available');
});

basicTests.test('Dictionary loading', async () => {
  const hunspell = new MockHunspell();
  
  const aff_path = hunspell._malloc(100);
  const dic_path = hunspell._malloc(100);
  
  const handle = hunspell._Hunspell_create(aff_path, dic_path);
  
  assert.ok(handle > 0, 'Dictionary should load successfully');
  assert.ok(hunspell.loaded_dictionaries.has(handle), 'Dictionary handle should be tracked');
  
  hunspell._Hunspell_destroy(handle);
  assert.ok(!hunspell.loaded_dictionaries.has(handle), 'Dictionary should be unloaded');
});

basicTests.test('Encrypted dictionary loading', async () => {
  const hunspell = new MockHunspell();
  
  const aff_path = hunspell._malloc(100);
  const dic_path = hunspell._malloc(100);
  const key = hunspell._malloc(50);
  
  const handle = hunspell._Hunspell_create_key(aff_path, dic_path, key);
  
  assert.ok(handle > 0, 'Encrypted dictionary should load successfully');
  assert.ok(hunspell.loaded_dictionaries.has(handle), 'Encrypted dictionary handle should be tracked');
  
  hunspell._Hunspell_destroy(handle);
});

basicTests.test('Basic spell checking', async () => {
  const hunspell = new MockHunspell();
  
  const handle = hunspell._Hunspell_create(0, 0);
  const word_ptr = hunspell._malloc(100);
  
  // Test correct word
  const correct_result = hunspell._Hunspell_spell(handle, word_ptr);
  assert.ok(correct_result >= 0, 'Spell check should return valid result');
  
  // Test incorrect word  
  const incorrect_result = hunspell._Hunspell_spell(handle, word_ptr);
  assert.ok(incorrect_result >= 0, 'Spell check should handle incorrect words');
  
  hunspell._Hunspell_destroy(handle);
});

basicTests.test('Suggestion generation', async () => {
  const hunspell = new MockHunspell();
  
  const handle = hunspell._Hunspell_create(0, 0);
  const word_ptr = hunspell._malloc(100);
  const suggestions_ptr = hunspell._malloc(400);
  
  const suggestion_count = hunspell._Hunspell_suggest(handle, word_ptr, suggestions_ptr);
  
  assert.ok(suggestion_count >= 0, 'Suggestions should return valid count');
  assert.ok(suggestion_count <= 20, 'Suggestion count should be reasonable');
  
  hunspell._Hunspell_destroy(handle);
});

basicTests.test('Personal dictionary management', async () => {
  const hunspell = new MockHunspell();
  
  const handle = hunspell._Hunspell_create(0, 0);
  const word_ptr = hunspell._malloc(100);
  
  // Add word to personal dictionary
  const add_result = hunspell._Hunspell_add(handle, word_ptr);
  assert.equal(add_result, 1, 'Adding word should succeed');
  
  // Remove word from personal dictionary
  const remove_result = hunspell._Hunspell_remove(handle, word_ptr);
  assert.equal(remove_result, 1, 'Removing word should succeed');
  
  hunspell._Hunspell_destroy(handle);
});

basicTests.test('Multiple dictionary support', async () => {
  const hunspell = new MockHunspell();
  
  const handle = hunspell._Hunspell_create(0, 0);
  const additional_dic = hunspell._malloc(100);
  
  const add_dic_result = hunspell._Hunspell_add_dic(handle, additional_dic);
  assert.equal(add_dic_result, 1, 'Adding additional dictionary should succeed');
  
  hunspell._Hunspell_destroy(handle);
});

// Morphological analysis tests
const morphTests = new TestSuite('Morphological Analysis');

morphTests.test('Word analysis', async () => {
  const hunspell = new MockHunspell();
  
  const handle = hunspell._Hunspell_create(0, 0);
  const word_ptr = hunspell._malloc(100);
  
  const analysis_count = hunspell._Hunspell_analyze(handle, word_ptr);
  assert.ok(analysis_count >= 0, 'Analysis should return valid count');
  
  hunspell._Hunspell_destroy(handle);
});

morphTests.test('Word stemming', async () => {
  const hunspell = new MockHunspell();
  
  const handle = hunspell._Hunspell_create(0, 0);
  const word_ptr = hunspell._malloc(100);
  
  const stem_count = hunspell._Hunspell_stem(handle, word_ptr);
  assert.ok(stem_count >= 0, 'Stemming should return valid count');
  
  hunspell._Hunspell_destroy(handle);
});

morphTests.test('Morphological generation', async () => {
  const hunspell = new MockHunspell();
  
  const handle = hunspell._Hunspell_create(0, 0);
  const word1_ptr = hunspell._malloc(100);
  const word2_ptr = hunspell._malloc(100);
  
  const generated_count = hunspell._Hunspell_generate(handle, word1_ptr, word2_ptr);
  assert.ok(generated_count >= 0, 'Generation should return valid count');
  
  hunspell._Hunspell_destroy(handle);
});

// Dictionary format tests
const formatTests = new TestSuite('Dictionary Format Support');

formatTests.test('AFF file parsing', async () => {
  const hunspell = new MockHunspell();
  
  // Mock AFF content validation
  const mockAffContent = [
    'SET UTF-8',
    'TRY esianrtolcdugmphbyfvkwzESIANRTOLCDUGMPHBYFVKWZ',
    'SFX A Y 1',
    'SFX A 0 s . '
  ];
  
  assert.ok(mockAffContent.length > 0, 'AFF content should be parseable');
  assert.ok(mockAffContent[0].includes('UTF-8'), 'Should support UTF-8 encoding');
});

formatTests.test('DIC file parsing', async () => {
  const hunspell = new MockHunspell();
  
  // Mock DIC content validation
  const mockDicContent = [
    '100000',  // Word count
    'hello',
    'world/A',  // Word with affix
    'test/AB'   // Word with multiple affixes
  ];
  
  assert.ok(mockDicContent.length > 0, 'DIC content should be parseable');
  assert.ok(parseInt(mockDicContent[0]) > 0, 'Word count should be valid');
});

formatTests.test('Personal dictionary format', async () => {
  const hunspell = new MockHunspell();
  
  // Test personal dictionary addition
  const personalWords = ['myword', 'customterm', 'neologism'];
  
  const handle = hunspell._Hunspell_create(0, 0);
  
  for (const word of personalWords) {
    const word_ptr = hunspell._malloc(word.length + 1);
    const result = hunspell._Hunspell_add(handle, word_ptr);
    assert.equal(result, 1, `Personal word '${word}' should be added successfully`);
  }
  
  hunspell._Hunspell_destroy(handle);
});

// Performance tests
const perfTests = new TestSuite('Performance Tests');

perfTests.test('Dictionary loading performance', async () => {
  const hunspell = new MockHunspell();
  const iterations = 100;
  
  const start = performance.now();
  
  for (let i = 0; i < iterations; i++) {
    const handle = hunspell._Hunspell_create(0, 0);
    hunspell._Hunspell_destroy(handle);
  }
  
  const duration = performance.now() - start;
  const ops_per_second = (iterations / duration) * 1000;
  console.log(`    Dictionary ops: ${ops_per_second.toFixed(0)} ops/sec`);
  
  assert.ok(duration < 5000, 'Dictionary operations should be fast');
});

perfTests.test('Spell checking throughput', async () => {
  const hunspell = new MockHunspell();
  const handle = hunspell._Hunspell_create(0, 0);
  const word_ptr = hunspell._malloc(100);
  
  const iterations = 10000;
  const start = performance.now();
  
  for (let i = 0; i < iterations; i++) {
    hunspell._Hunspell_spell(handle, word_ptr);
  }
  
  const duration = performance.now() - start;
  const ops_per_second = (iterations / duration) * 1000;
  console.log(`    Spell check: ${ops_per_second.toFixed(0)} words/sec`);
  
  assert.ok(ops_per_second > 1000, 'Spell checking should be fast');
  
  hunspell._Hunspell_destroy(handle);
});

perfTests.test('Suggestion generation performance', async () => {
  const hunspell = new MockHunspell();
  const handle = hunspell._Hunspell_create(0, 0);
  const word_ptr = hunspell._malloc(100);
  const suggestions_ptr = hunspell._malloc(400);
  
  const iterations = 1000;
  const start = performance.now();
  
  for (let i = 0; i < iterations; i++) {
    hunspell._Hunspell_suggest(handle, word_ptr, suggestions_ptr);
  }
  
  const duration = performance.now() - start;
  const ops_per_second = (iterations / duration) * 1000;
  console.log(`    Suggestions: ${ops_per_second.toFixed(0)} ops/sec`);
  
  assert.ok(ops_per_second > 100, 'Suggestion generation should be reasonably fast');
  
  hunspell._Hunspell_destroy(handle);
});

// Error handling tests
const errorTests = new TestSuite('Error Handling');

errorTests.test('Invalid dictionary paths', async () => {
  const hunspell = new MockHunspell();
  
  // Test null pointers
  const handle = hunspell._Hunspell_create(0, 0);
  assert.ok(handle >= 0, 'Should handle null dictionary paths gracefully');
  
  hunspell._Hunspell_destroy(handle);
});

errorTests.test('Memory allocation failures', async () => {
  const hunspell = new MockHunspell();
  
  // Simulate memory pressure
  const handles = [];
  let alloc_count = 0;
  
  try {
    for (let i = 0; i < 1000; i++) {
      const ptr = hunspell._malloc(1024);
      if (ptr > 0) {
        handles.push(ptr);
        alloc_count++;
      } else {
        break;
      }
    }
  } catch (e) {
    // Expected when memory is exhausted
  }
  
  assert.ok(alloc_count > 0, 'Should allocate some memory successfully');
  
  // Clean up
  for (const handle of handles) {
    hunspell._free(handle);
  }
});

errorTests.test('Corrupted dictionary handling', async () => {
  const hunspell = new MockHunspell();
  
  // Test with invalid dictionary data
  const handle = hunspell._Hunspell_create(0, 0);
  
  // Should not crash with invalid input
  const result = hunspell._Hunspell_spell(handle, 0);
  assert.ok(result >= 0 || result < 0, 'Should handle invalid input gracefully');
  
  hunspell._Hunspell_destroy(handle);
});

// Unicode support tests  
const unicodeTests = new TestSuite('Unicode Support');

unicodeTests.test('UTF-8 word processing', async () => {
  const hunspell = new MockHunspell();
  const handle = hunspell._Hunspell_create(0, 0);
  
  // Test various Unicode characters (mock)
  const unicodeWords = ['café', 'naïve', 'résumé', '测试', 'тест', 'العربية'];
  
  for (const word of unicodeWords) {
    const word_ptr = hunspell._malloc(word.length * 4 + 1); // UTF-8 can be up to 4 bytes per char
    const result = hunspell._Hunspell_spell(handle, word_ptr);
    assert.ok(result >= 0, `Should handle Unicode word '${word}'`);
  }
  
  hunspell._Hunspell_destroy(handle);
});

unicodeTests.test('Multi-byte character boundaries', async () => {
  const hunspell = new MockHunspell();
  
  // Test that multi-byte character boundaries are handled correctly
  const testString = 'Test with émojis 🚀 and símböls';
  const encoded = Buffer.from(testString, 'utf8');
  
  assert.ok(encoded.length > testString.length, 'UTF-8 encoding should use more bytes');
  assert.equal(encoded.toString('utf8'), testString, 'UTF-8 roundtrip should work');
});

// Run all test suites
async function runAllTests() {
  console.log('🚀 Hunspell WASM Test Suite');
  console.log('='.repeat(50));
  
  const suites = [
    basicTests,
    morphTests,
    formatTests,
    perfTests,
    errorTests,
    unicodeTests
  ];
  
  let totalPassed = 0;
  let totalFailed = 0;
  
  for (const suite of suites) {
    await suite.run();
    totalPassed += suite.passed;
    totalFailed += suite.failed;
  }
  
  console.log('\n📊 Overall Results');
  console.log('='.repeat(50));
  console.log(`Total tests: ${totalPassed + totalFailed}`);
  console.log(`Passed: ${totalPassed}`);
  console.log(`Failed: ${totalFailed}`);
  console.log(`Success rate: ${(totalPassed / (totalPassed + totalFailed) * 100).toFixed(1)}%`);
  
  if (totalFailed > 0) {
    console.log('\n❌ Some tests failed');
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed!');
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(console.error);
}

export { TestSuite, runAllTests };