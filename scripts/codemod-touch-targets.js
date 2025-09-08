/**
 * JSCodeshift Codemod: Auto-add min-h-12 to interactive elements
 * Usage: npx jscodeshift -t scripts/codemod-touch-targets.js "src/**/*.{ts,tsx,js,jsx}"
 */

// Interactive element patterns that need touch target compliance
const interactiveElements = ['Button', 'button'];
const interactiveProps = ['onClick', 'onPress', 'onTap'];

function hasInteractiveProps(element) {
  if (!element.openingElement || !element.openingElement.attributes) {
    return false;
  }
  
  return element.openingElement.attributes.some(attr => 
    attr.type === 'JSXAttribute' && 
    interactiveProps.includes(attr.name?.name)
  );
}

function hasMinHeightClass(classNames) {
  return /\bmin-h-\d+\b/.test(classNames);
}

function hasHeightClass(classNames) {
  return /\bh-\d+\b/.test(classNames);
}

function isUndersizedHeight(classNames) {
  return /\b(h|min-h)-(8|9|10|11)\b/.test(classNames);
}

function addTouchTargetClass(classNames) {
  // If already has adequate size (h-12 or min-h-12 or larger), don't modify
  if (/\b(h|min-h)-(1[2-9]|[2-9]\d)\b/.test(classNames)) {
    return classNames;
  }
  
  // If has undersized height, replace with min-h-12
  if (isUndersizedHeight(classNames)) {
    return classNames
      .replace(/\bh-(8|9|10|11)\b/g, 'h-12')
      .replace(/\bmin-h-(8|9|10|11)\b/g, 'min-h-12');
  }
  
  // If no height class but is interactive, add min-h-12
  if (!hasHeightClass(classNames) && !hasMinHeightClass(classNames)) {
    return `${classNames} min-h-12`.trim();
  }
  
  return classNames;
}

module.exports = function transformer(fileInfo, api) {
  const j = api.jscodeshift;
  const source = j(fileInfo.source);
  let hasChanges = false;

  // Find interactive JSX elements
  source.find(j.JSXElement).forEach(path => {
    const element = path.value;
    const elementName = element.openingElement?.name?.name;
    
    // Check if it's a known interactive element or has interactive props
    const isInteractiveElement = interactiveElements.includes(elementName);
    const hasInteractiveHandler = hasInteractiveProps(element);
    
    if (!isInteractiveElement && !hasInteractiveHandler) {
      return;
    }
    
    // Find className attribute
    const classNameAttr = element.openingElement?.attributes?.find(
      attr => attr.type === 'JSXAttribute' && attr.name?.name === 'className'
    );
    
    if (classNameAttr?.value) {
      if (classNameAttr.value.type === 'Literal') {
        const originalClasses = classNameAttr.value.value;
        const updatedClasses = addTouchTargetClass(originalClasses);
        
        if (originalClasses !== updatedClasses) {
          classNameAttr.value.value = updatedClasses;
          hasChanges = true;
          console.log(`✅ Updated ${elementName || 'interactive element'} in ${fileInfo.path}: "${originalClasses}" → "${updatedClasses}"`);
        }
      }
      
      if (classNameAttr.value.type === 'JSXExpressionContainer' && 
          classNameAttr.value.expression.type === 'TemplateLiteral') {
        const templateLiteral = classNameAttr.value.expression;
        templateLiteral.quasis.forEach(quasi => {
          const original = quasi.value.raw;
          const updated = addTouchTargetClass(original);
          
          if (original !== updated) {
            quasi.value.raw = updated;
            quasi.value.cooked = updated;
            hasChanges = true;
            console.log(`✅ Updated template in ${fileInfo.path}: "${original}" → "${updated}"`);
          }
        });
      }
    } else if (isInteractiveElement || hasInteractiveHandler) {
      // Add className with min-h-12 if no className exists
      const newClassNameAttr = j.jsxAttribute(
        j.jsxIdentifier('className'),
        j.literal('min-h-12')
      );
      
      element.openingElement.attributes.push(newClassNameAttr);
      hasChanges = true;
      console.log(`✅ Added min-h-12 to ${elementName || 'interactive element'} in ${fileInfo.path}`);
    }
  });

  if (hasChanges) {
    console.log(`🎯 Updated touch targets in: ${fileInfo.path}`);
  }

  return hasChanges ? source.toSource() : null;
};

module.exports.parser = 'tsx';