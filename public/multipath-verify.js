// Multipath Verification Script
// Paste this into browser console on /edu-treemulti

(function verifyMultipath() {
  console.log('🔍 Multipath Verification Starting...');
  
  // 1. Check URL and flags
  const url = location.href;
  const hasCompare = url.includes('compare=');
  console.log('✅ URL:', url);
  console.log('✅ Has compare param:', hasCompare);
  
  // 2. Check feature flags
  const flags = window.getFeatureFlags?.() || {};
  const flagsOK = flags.eduTreeOutcomes && flags.eduTreeMultiPathOverlay;
  console.log('✅ Flags:', { 
    eduTreeOutcomes: flags.eduTreeOutcomes,
    eduTreeMultiPathOverlay: flags.eduTreeMultiPathOverlay,
    flagsOK 
  });
  
  // 3. Check snapshot data
  const snap = window.__EDUTREE__?.getSnapshot?.();
  const hasData = snap?.primary?.nodes?.length > 0 && snap?.comparison?.nodes?.length > 0;
  console.log('✅ Snapshot:', {
    primaryNodes: snap?.primary?.nodes?.length || 0,
    primaryEdges: snap?.primary?.edges?.length || 0,
    comparisonNodes: snap?.comparison?.nodes?.length || 0,
    comparisonEdges: snap?.comparison?.edges?.length || 0,
    hasData
  });
  
  // 4. Check CSS classes applied
  const primaryEdges = document.querySelectorAll('.edge--primary').length;
  const comparisonEdges = document.querySelectorAll('.edge--comparison').length;
  const primaryNodes = document.querySelectorAll('.node--primary').length;
  const comparisonNodes = document.querySelectorAll('.node--comparison').length;
  const multipathActive = document.querySelector('.multipath-active') !== null;
  
  console.log('✅ Visual Elements:', {
    primaryEdges,
    comparisonEdges,
    primaryNodes,
    comparisonNodes,
    multipathActive,
    hasVisibleComparison: comparisonEdges > 0
  });
  
  // 5. Check Year 3 blocks
  const allNodes = document.querySelectorAll('.react-flow__node');
  const nodeTexts = Array.from(allNodes).map(n => n.textContent?.toLowerCase() || '');
  const year3Terms = ['web frontend ii', 'data analytics ii', 'systems', 'devops'];
  const year3Nodes = nodeTexts.filter(text => 
    year3Terms.some(term => text.includes(term))
  ).length;
  
  console.log('✅ Year 3 Blocks:', {
    totalNodes: allNodes.length,
    year3Nodes,
    hasYear3: year3Nodes > 0
  });
  
  // 6. Check path diversity (overlap analysis)
  if (snap?.primary && snap?.comparison) {
    const P = new Set(snap.primary.nodes);
    const C = new Set(snap.comparison.nodes);
    const inter = [...P].filter(x => C.has(x));
    const uniqC = [...C].filter(x => !P.has(x));
    const uniqP = [...P].filter(x => !C.has(x));
    const jaccard = P.size + C.size === 0 ? 0 : inter.length / (P.size + C.size - inter.length);
    
    const diversity = {
      overlap: inter.length,
      uniqueInCompare: uniqC.length,
      uniqueInPrimary: uniqP.length,
      jaccard: Math.round(jaccard * 100) / 100,
      isDiverse: uniqC.length >= 2 && inter.length < P.size
    };
    
    console.log('✅ Path Diversity:', diversity);
    
    if (!diversity.isDiverse) {
      console.warn('⚠️  Paths too similar! Comparison is mostly a superset of primary.');
      console.log('Expected: uniqueInCompare >= 2, overlap < primaryCount');
    }
  }

  // 7. Overall status
  const allGood = flagsOK && hasData && comparisonEdges > 0 && year3Nodes > 0;
  console.log(allGood ? '🎉 MULTIPATH WORKING!' : '❌ Issues detected');
  
  // 7. Quick fixes if needed
  if (!hasCompare) {
    console.log('🔧 Auto-fixing: Adding ?compare=cheapest');
    location.search = '?compare=cheapest';
  }
  
  return {
    url,
    flagsOK,
    hasData,
    visualElements: { primaryEdges, comparisonEdges, primaryNodes, comparisonNodes },
    year3Nodes,
    allGood
  };
})();