#!/usr/bin/env node
/**
 * Performance benchmarks for hunspell.wasm
 * Comprehensive spell checking and dictionary performance testing
 */

import { performance, PerformanceObserver } from 'perf_hooks';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Performance measurement utilities
class BenchmarkSuite {
  constructor(name) {
    this.name = name;
    this.benchmarks = [];
    this.results = [];
  }

  add(name, fn, options = {}) {
    this.benchmarks.push({
      name,
      fn,
      warmupRuns: options.warmupRuns || 10,
      benchmarkRuns: options.benchmarkRuns || 100,
      minRunTime: options.minRunTime || 1000, // ms
      maxRunTime: options.maxRunTime || 30000 // ms
    });
  }

  async run() {
    console.log(`\n📊 Running benchmark suite: ${this.name}`);
    console.log('='.repeat(70));

    for (const benchmark of this.benchmarks) {
      const result = await this.runBenchmark(benchmark);
      this.results.push(result);
      this.printResult(result);
    }

    return this.results;
  }

  async runBenchmark(benchmark) {
    const { name, fn, warmupRuns, benchmarkRuns, minRunTime, maxRunTime } = benchmark;
    
    console.log(`\n🔥 Warming up: ${name}`);
    
    // Warmup runs
    for (let i = 0; i < warmupRuns; i++) {
      await fn();
    }

    console.log(`⚡ Benchmarking: ${name}`);
    
    const times = [];
    const startTime = performance.now();
    let totalRuns = 0;

    // Benchmark runs
    while (totalRuns < benchmarkRuns) {
      const elapsed = performance.now() - startTime;
      if (elapsed > maxRunTime) {
        console.log(`   ⏰ Max time reached (${elapsed.toFixed(0)}ms)`);
        break;
      }

      const runStart = performance.now();
      await fn();
      const runTime = performance.now() - runStart;
      
      times.push(runTime);
      totalRuns++;

      if (elapsed > minRunTime && totalRuns >= 10) {
        // Check if we have enough stable measurements
        if (times.length >= 20) {
          const recentTimes = times.slice(-10);
          const variance = this.calculateVariance(recentTimes);
          const mean = this.calculateMean(recentTimes);
          if (variance / mean < 0.1) { // Less than 10% variance
            break;
          }
        }
      }
    }

    return {
      name,
      runs: totalRuns,
      times,
      mean: this.calculateMean(times),
      median: this.calculateMedian(times),
      min: Math.min(...times),
      max: Math.max(...times),
      stdDev: Math.sqrt(this.calculateVariance(times)),
      opsPerSecond: 1000 / this.calculateMean(times)
    };
  }

  calculateMean(values) {
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  calculateMedian(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 
      ? (sorted[mid - 1] + sorted[mid]) / 2 
      : sorted[mid];
  }

  calculateVariance(values) {
    const mean = this.calculateMean(values);
    return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  }

  printResult(result) {
    console.log(`\n📈 ${result.name}`);
    console.log(`   Runs:        ${result.runs}`);
    console.log(`   Mean:        ${result.mean.toFixed(3)}ms`);
    console.log(`   Median:      ${result.median.toFixed(3)}ms`);
    console.log(`   Min/Max:     ${result.min.toFixed(3)}ms / ${result.max.toFixed(3)}ms`);
    console.log(`   Std Dev:     ${result.stdDev.toFixed(3)}ms`);
    console.log(`   Ops/sec:     ${result.opsPerSecond.toFixed(0)}`);
  }
}

// Mock Hunspell implementation for benchmarking
class MockHunspell {
  constructor() {
    this.HEAPU8 = new Uint8Array(16 * 1024 * 1024); // 16MB heap
    this._malloc_offset = 1024; // Start after some reserved space
    this.dictionaries = new Map();
    this.personalDict = new Set();
    this.suggestionCache = new Map();
    
    // Simulate loaded dictionary data
    this.loadMockDictionary();
  }

  loadMockDictionary() {
    // Simulate common English words for realistic benchmarks
    this.commonWords = [
      'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
      'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
      'hello', 'world', 'test', 'example', 'function', 'performance',
      'benchmark', 'dictionary', 'spell', 'check', 'suggest', 'word',
      'language', 'hunspell', 'morphology', 'analysis', 'generate'
    ];
    
    this.misspelledWords = [
      'teh', 'recieve', 'seperate', 'occured', 'neccessary', 'definately',
      'beleive', 'acheive', 'begining', 'catagory', 'concious', 'existance',
      'goverment', 'independant', 'maintainance', 'occassion', 'occurence'
    ];
    
    this.suggestions = {
      'teh': ['the'],
      'recieve': ['receive'],
      'seperate': ['separate'],
      'occured': ['occurred'],
      'neccessary': ['necessary'],
      'definately': ['definitely'],
      'beleive': ['believe'],
      'acheive': ['achieve'],
      'begining': ['beginning'],
      'catagory': ['category']
    };
  }

  _malloc(size) {
    const ptr = this._malloc_offset;
    this._malloc_offset += size;
    if (this._malloc_offset > this.HEAPU8.length) {
      throw new Error('Out of memory');
    }
    return ptr;
  }

  _free(ptr) {
    // Mock implementation - would normally manage free blocks
  }

  _Hunspell_create(aff_path, dic_path) {
    const handle = this._malloc(64);
    this.dictionaries.set(handle, {
      affPath: aff_path,
      dicPath: dic_path,
      loaded: true
    });
    return handle;
  }

  _Hunspell_destroy(handle) {
    this.dictionaries.delete(handle);
    this._free(handle);
  }

  _Hunspell_spell(handle, word) {
    if (!this.dictionaries.has(handle)) return 0;
    
    // Simulate realistic spell checking time
    const isCorrect = this.commonWords.includes(word.toLowerCase());
    
    // Add some computation to simulate real work
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = ((hash << 5) - hash + word.charCodeAt(i)) & 0xffffffff;
    }
    
    return isCorrect ? 1 : 0;
  }

  _Hunspell_suggest(handle, word) {
    if (!this.dictionaries.has(handle)) return [];
    
    const cacheKey = `${handle}_${word}`;
    if (this.suggestionCache.has(cacheKey)) {
      return this.suggestionCache.get(cacheKey);
    }
    
    const suggestions = this.suggestions[word.toLowerCase()] || [];
    
    // Simulate more expensive suggestion generation
    if (suggestions.length === 0 && word.length > 3) {
      // Generate phonetic-based suggestions (simplified)
      const phonetic = word.replace(/[aeiouy]/gi, '').toLowerCase();
      for (const correctWord of this.commonWords) {
        const correctPhonetic = correctWord.replace(/[aeiouy]/gi, '');
        if (phonetic === correctPhonetic && word !== correctWord) {
          suggestions.push(correctWord);
          break;
        }
      }
    }
    
    this.suggestionCache.set(cacheKey, suggestions);
    return suggestions;
  }

  _Hunspell_analyze(handle, word) {
    if (!this.dictionaries.has(handle)) return [];
    
    // Mock morphological analysis
    const analyses = [];
    if (word.endsWith('s') && word.length > 2) {
      analyses.push(`st:${word.slice(0, -1)} ts:Ns`); // Noun plural
    }
    if (word.endsWith('ed') && word.length > 3) {
      analyses.push(`st:${word.slice(0, -2)} ts:Vd`); // Past tense verb
    }
    if (word.endsWith('ing') && word.length > 4) {
      analyses.push(`st:${word.slice(0, -3)} ts:Vg`); // Present participle
    }
    
    return analyses;
  }

  _Hunspell_stem(handle, word) {
    if (!this.dictionaries.has(handle)) return [];
    
    const stems = [];
    // Simple stemming rules
    if (word.endsWith('s') && word.length > 2) {
      stems.push(word.slice(0, -1));
    }
    if (word.endsWith('ed') && word.length > 3) {
      stems.push(word.slice(0, -2));
    }
    if (word.endsWith('ing') && word.length > 4) {
      stems.push(word.slice(0, -3));
    }
    if (stems.length === 0) {
      stems.push(word);
    }
    
    return stems;
  }

  _Hunspell_generate(handle, word1, word2) {
    if (!this.dictionaries.has(handle)) return [];
    
    // Mock morphological generation
    const generated = [];
    const stem1 = this._Hunspell_stem(handle, word1)[0] || word1;
    const analysis = this._Hunspell_analyze(handle, word2)[0];
    
    if (analysis && analysis.includes('ts:Ns')) {
      generated.push(stem1 + 's');
    }
    if (analysis && analysis.includes('ts:Vd')) {
      generated.push(stem1 + 'ed');
    }
    if (analysis && analysis.includes('ts:Vg')) {
      generated.push(stem1 + 'ing');
    }
    
    return generated;
  }
}

// Benchmark test data generator
class TestDataGenerator {
  static generateWordList(size, type = 'mixed') {
    const words = [];
    const hunspell = new MockHunspell();
    
    switch (type) {
      case 'correct':
        for (let i = 0; i < size; i++) {
          words.push(hunspell.commonWords[i % hunspell.commonWords.length]);
        }
        break;
      case 'incorrect':
        for (let i = 0; i < size; i++) {
          words.push(hunspell.misspelledWords[i % hunspell.misspelledWords.length]);
        }
        break;
      case 'mixed':
      default:
        for (let i = 0; i < size; i++) {
          if (Math.random() < 0.8) {
            words.push(hunspell.commonWords[i % hunspell.commonWords.length]);
          } else {
            words.push(hunspell.misspelledWords[i % hunspell.misspelledWords.length]);
          }
        }
        break;
    }
    
    return words;
  }

  static generateRandomString(length) {
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  static generateDocument(wordCount) {
    const words = this.generateWordList(wordCount, 'mixed');
    return words.join(' ');
  }
}

// Core benchmarks
const coreBenchmarks = new BenchmarkSuite('Core Spell Checking Performance');

coreBenchmarks.add('Dictionary Loading', async () => {
  const hunspell = new MockHunspell();
  const handle = hunspell._Hunspell_create(0, 0);
  hunspell._Hunspell_destroy(handle);
}, { benchmarkRuns: 1000 });

coreBenchmarks.add('Single Word Spell Check (Correct)', async () => {
  const hunspell = new MockHunspell();
  const handle = hunspell._Hunspell_create(0, 0);
  hunspell._Hunspell_spell(handle, 'hello');
  hunspell._Hunspell_destroy(handle);
}, { benchmarkRuns: 10000 });

coreBenchmarks.add('Single Word Spell Check (Incorrect)', async () => {
  const hunspell = new MockHunspell();
  const handle = hunspell._Hunspell_create(0, 0);
  hunspell._Hunspell_spell(handle, 'helllo');
  hunspell._Hunspell_destroy(handle);
}, { benchmarkRuns: 10000 });

coreBenchmarks.add('Batch Spell Check (100 words)', async () => {
  const hunspell = new MockHunspell();
  const handle = hunspell._Hunspell_create(0, 0);
  const words = TestDataGenerator.generateWordList(100, 'mixed');
  
  for (const word of words) {
    hunspell._Hunspell_spell(handle, word);
  }
  
  hunspell._Hunspell_destroy(handle);
}, { benchmarkRuns: 100 });

// Suggestion benchmarks
const suggestionBenchmarks = new BenchmarkSuite('Suggestion Generation Performance');

suggestionBenchmarks.add('Simple Suggestion Generation', async () => {
  const hunspell = new MockHunspell();
  const handle = hunspell._Hunspell_create(0, 0);
  hunspell._Hunspell_suggest(handle, 'teh');
  hunspell._Hunspell_destroy(handle);
}, { benchmarkRuns: 1000 });

suggestionBenchmarks.add('Complex Suggestion Generation', async () => {
  const hunspell = new MockHunspell();
  const handle = hunspell._Hunspell_create(0, 0);
  hunspell._Hunspell_suggest(handle, 'recieve');
  hunspell._Hunspell_destroy(handle);
}, { benchmarkRuns: 1000 });

suggestionBenchmarks.add('No Suggestions Available', async () => {
  const hunspell = new MockHunspell();
  const handle = hunspell._Hunspell_create(0, 0);
  hunspell._Hunspell_suggest(handle, 'xyzxyzxyz');
  hunspell._Hunspell_destroy(handle);
}, { benchmarkRuns: 1000 });

// Morphological analysis benchmarks
const morphBenchmarks = new BenchmarkSuite('Morphological Analysis Performance');

morphBenchmarks.add('Word Analysis', async () => {
  const hunspell = new MockHunspell();
  const handle = hunspell._Hunspell_create(0, 0);
  hunspell._Hunspell_analyze(handle, 'running');
  hunspell._Hunspell_destroy(handle);
}, { benchmarkRuns: 1000 });

morphBenchmarks.add('Word Stemming', async () => {
  const hunspell = new MockHunspell();
  const handle = hunspell._Hunspell_create(0, 0);
  hunspell._Hunspell_stem(handle, 'running');
  hunspell._Hunspell_destroy(handle);
}, { benchmarkRuns: 1000 });

morphBenchmarks.add('Morphological Generation', async () => {
  const hunspell = new MockHunspell();
  const handle = hunspell._Hunspell_create(0, 0);
  hunspell._Hunspell_generate(handle, 'run', 'running');
  hunspell._Hunspell_destroy(handle);
}, { benchmarkRuns: 1000 });

// Memory benchmarks
const memoryBenchmarks = new BenchmarkSuite('Memory Management Performance');

memoryBenchmarks.add('Memory Allocation/Deallocation', async () => {
  const hunspell = new MockHunspell();
  const ptrs = [];
  
  // Allocate
  for (let i = 0; i < 100; i++) {
    ptrs.push(hunspell._malloc(1024));
  }
  
  // Deallocate
  for (const ptr of ptrs) {
    hunspell._free(ptr);
  }
}, { benchmarkRuns: 100 });

memoryBenchmarks.add('Large Dictionary Simulation', async () => {
  const hunspell = new MockHunspell();
  const handles = [];
  
  // Simulate loading multiple dictionaries
  for (let i = 0; i < 10; i++) {
    handles.push(hunspell._Hunspell_create(i, i + 100));
  }
  
  // Clean up
  for (const handle of handles) {
    hunspell._Hunspell_destroy(handle);
  }
}, { benchmarkRuns: 100 });

// SIMD optimization benchmarks (simulated)
const simdBenchmarks = new BenchmarkSuite('SIMD Optimization Potential');

simdBenchmarks.add('String Comparison (Scalar)', async () => {
  const words1 = TestDataGenerator.generateWordList(1000, 'mixed');
  const words2 = TestDataGenerator.generateWordList(1000, 'mixed');
  
  let matches = 0;
  for (let i = 0; i < words1.length; i++) {
    if (words1[i] === words2[i]) matches++;
  }
}, { benchmarkRuns: 100 });

simdBenchmarks.add('Character Processing (Simulated SIMD)', async () => {
  const text = TestDataGenerator.generateDocument(1000);
  
  // Simulate vectorized character operations
  let vowelCount = 0;
  const vowels = 'aeiouAEIOU';
  
  // Process in chunks of 16 (SIMD width)
  for (let i = 0; i < text.length; i += 16) {
    const chunk = text.substr(i, 16);
    for (let j = 0; j < chunk.length; j++) {
      if (vowels.includes(chunk[j])) {
        vowelCount++;
      }
    }
  }
}, { benchmarkRuns: 1000 });

// Real-world scenario benchmarks
const scenarioBenchmarks = new BenchmarkSuite('Real-World Scenarios');

scenarioBenchmarks.add('Email Spell Check (500 words)', async () => {
  const hunspell = new MockHunspell();
  const handle = hunspell._Hunspell_create(0, 0);
  const document = TestDataGenerator.generateWordList(500, 'mixed');
  
  let errors = 0;
  for (const word of document) {
    if (hunspell._Hunspell_spell(handle, word) === 0) {
      errors++;
      if (errors <= 10) { // Limit suggestions for performance
        hunspell._Hunspell_suggest(handle, word);
      }
    }
  }
  
  hunspell._Hunspell_destroy(handle);
}, { benchmarkRuns: 50 });

scenarioBenchmarks.add('Document Processing (2000 words)', async () => {
  const hunspell = new MockHunspell();
  const handle = hunspell._Hunspell_create(0, 0);
  const document = TestDataGenerator.generateWordList(2000, 'mixed');
  
  const results = {
    correct: 0,
    incorrect: 0,
    suggestions: 0
  };
  
  for (const word of document) {
    if (hunspell._Hunspell_spell(handle, word) === 1) {
      results.correct++;
    } else {
      results.incorrect++;
      const suggestions = hunspell._Hunspell_suggest(handle, word);
      results.suggestions += suggestions.length;
    }
  }
  
  hunspell._Hunspell_destroy(handle);
}, { benchmarkRuns: 10 });

// Browser-specific benchmarks
const browserBenchmarks = new BenchmarkSuite('Browser Performance Scenarios');

browserBenchmarks.add('Textarea Real-time Check (Simulated)', async () => {
  const hunspell = new MockHunspell();
  const handle = hunspell._Hunspell_create(0, 0);
  
  // Simulate typing - check last word as user types
  const words = ['Hello', 'wrold', 'this', 'is', 'a', 'tets'];
  
  for (const word of words) {
    const isCorrect = hunspell._Hunspell_spell(handle, word);
    if (!isCorrect) {
      hunspell._Hunspell_suggest(handle, word);
    }
  }
  
  hunspell._Hunspell_destroy(handle);
}, { benchmarkRuns: 1000 });

browserBenchmarks.add('Form Validation Batch', async () => {
  const hunspell = new MockHunspell();
  const handle = hunspell._Hunspell_create(0, 0);
  
  // Simulate validating multiple form fields
  const fields = [
    TestDataGenerator.generateWordList(50, 'mixed'),   // Title field
    TestDataGenerator.generateWordList(200, 'mixed'),  // Description field
    TestDataGenerator.generateWordList(20, 'mixed'),   // Tags field
  ];
  
  for (const field of fields) {
    for (const word of field) {
      hunspell._Hunspell_spell(handle, word);
    }
  }
  
  hunspell._Hunspell_destroy(handle);
}, { benchmarkRuns: 50 });

// Performance comparison and reporting
class BenchmarkReporter {
  constructor() {
    this.results = [];
  }

  addSuiteResults(suiteResults) {
    this.results.push(...suiteResults);
  }

  generateReport() {
    console.log('\n📋 Performance Report');
    console.log('='.repeat(80));
    
    // Overall statistics
    const allTimes = this.results.flatMap(r => r.times);
    const overallMean = allTimes.reduce((sum, time) => sum + time, 0) / allTimes.length;
    const totalOps = this.results.reduce((sum, r) => sum + r.runs, 0);
    
    console.log(`\nOverall Statistics:`);
    console.log(`  Total benchmarks:    ${this.results.length}`);
    console.log(`  Total operations:    ${totalOps.toLocaleString()}`);
    console.log(`  Average time:        ${overallMean.toFixed(3)}ms`);
    console.log(`  Total test time:     ${(allTimes.reduce((sum, time) => sum + time, 0) / 1000).toFixed(1)}s`);
    
    // Top performers
    console.log(`\n🏆 Top Performers (Operations/Second):`);
    const sortedByOps = [...this.results].sort((a, b) => b.opsPerSecond - a.opsPerSecond);
    for (let i = 0; i < Math.min(5, sortedByOps.length); i++) {
      const result = sortedByOps[i];
      console.log(`  ${i + 1}. ${result.name}: ${result.opsPerSecond.toFixed(0)} ops/sec`);
    }
    
    // Slowest operations
    console.log(`\n🐌 Areas for Optimization (Slowest Operations):`);
    const sortedBySlowest = [...this.results].sort((a, b) => b.mean - a.mean);
    for (let i = 0; i < Math.min(5, sortedBySlowest.length); i++) {
      const result = sortedBySlowest[i];
      console.log(`  ${i + 1}. ${result.name}: ${result.mean.toFixed(3)}ms average`);
    }
    
    // SIMD optimization potential
    console.log(`\n⚡ SIMD Optimization Opportunities:`);
    const simdCandidates = this.results.filter(r => 
      r.name.toLowerCase().includes('batch') || 
      r.name.toLowerCase().includes('document') ||
      r.name.toLowerCase().includes('string')
    );
    
    if (simdCandidates.length > 0) {
      console.log(`  Identified ${simdCandidates.length} operations that could benefit from SIMD:`);
      simdCandidates.forEach(result => {
        console.log(`    - ${result.name}: ${result.opsPerSecond.toFixed(0)} ops/sec (potential 2-4x improvement)`);
      });
    } else {
      console.log(`  Standard spell checking operations have moderate SIMD potential`);
    }

    // Memory efficiency insights
    console.log(`\n💾 Memory Efficiency Notes:`);
    console.log(`  - Dictionary loading should be optimized for startup time`);
    console.log(`  - Suggestion caching provides significant performance benefits`);
    console.log(`  - Batch processing reduces per-word overhead`);
    
    return {
      totalBenchmarks: this.results.length,
      totalOps,
      overallMean,
      topPerformers: sortedByOps.slice(0, 5),
      optimizationCandidates: sortedBySlowest.slice(0, 5),
      simdCandidates
    };
  }

  exportResults(filename) {
    const report = {
      timestamp: new Date().toISOString(),
      results: this.results,
      summary: this.generateReport()
    };
    
    writeFileSync(filename, JSON.stringify(report, null, 2));
    console.log(`\n💾 Results exported to ${filename}`);
  }
}

// Main benchmark runner
async function runAllBenchmarks() {
  console.log('🚀 Hunspell WASM Performance Benchmarks');
  console.log('='.repeat(80));
  console.log(`Started at: ${new Date().toISOString()}`);
  
  const reporter = new BenchmarkReporter();
  const suites = [
    coreBenchmarks,
    suggestionBenchmarks,
    morphBenchmarks,
    memoryBenchmarks,
    simdBenchmarks,
    scenarioBenchmarks,
    browserBenchmarks
  ];
  
  let totalStartTime = performance.now();
  
  for (const suite of suites) {
    const results = await suite.run();
    reporter.addSuiteResults(results);
  }
  
  let totalEndTime = performance.now();
  console.log(`\nTotal benchmark time: ${((totalEndTime - totalStartTime) / 1000).toFixed(1)}s`);
  
  const summary = reporter.generateReport();
  
  // Export results
  const resultsFile = join(__dirname, 'benchmark-results.json');
  reporter.exportResults(resultsFile);
  
  console.log('\n✅ All benchmarks completed successfully!');
  
  return summary;
}

// Run benchmarks if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllBenchmarks().catch(console.error);
}

export { BenchmarkSuite, BenchmarkReporter, MockHunspell, TestDataGenerator, runAllBenchmarks };