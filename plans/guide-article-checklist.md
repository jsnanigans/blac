# Guide Article Quality Checklist

Use this checklist when creating or refactoring guide articles to ensure consistency and quality.

## Pre-Writing Checklist

- [ ] Demo component exists and is registered in DemoRegistry
- [ ] Demo is functional and tested
- [ ] **Interactive component extracted** from full demo article (e.g., `CounterInteractive`, `ReadingStateInteractive`)
  - [ ] Create separate `*Interactive.tsx` file with just UI components
  - [ ] Export interactive component from demo folder
  - [ ] Add to `MdxComponents.tsx` imports and exports
  - [ ] Use interactive component in MDX (not `<DemoPreview>`)
- [ ] Related demos identified
- [ ] Learning objectives clearly defined
- [ ] Article placement in guide structure confirmed

## Structure Checklist

### Required Sections
- [ ] Export statements (`demoId` and `sectionId`) at top of file
- [ ] Introduction section with clear overview
- [ ] "What You'll Learn" bulleted list
- [ ] Core concept explanation
- [ ] At least one code example with syntax highlighting
- [ ] "Using in React" section with TSX example
- [ ] "Try It Out" section with `<DemoPreview>` component
- [ ] "Key Takeaways" bulleted list
- [ ] "Next Steps" section linking to related demos

### Recommended Sections
- [ ] "How It Works" explaining the process step-by-step
- [ ] "Common Patterns" showing 2-3 real-world use cases
- [ ] "Common Pitfalls" or anti-patterns section
- [ ] "Real-World Example" with practical scenario
- [ ] "Type Safety & TypeScript" highlighting benefits
- [ ] At least 2 `GuideArticleNote` callouts (tips, warnings, or important info)

### Optional Sections (use when appropriate)
- [ ] "Advanced Topics" for power users
- [ ] "Testing Considerations" showing test examples
- [ ] "Performance Considerations" for optimization tips
- [ ] "Additional Resources" for external links

## Content Quality Checklist

### Writing Quality
- [ ] Clear, concise language (avoid jargon unless explained)
- [ ] Friendly, encouraging tone
- [ ] Active voice preferred
- [ ] Second person ("you") for instructions
- [ ] No spelling or grammar errors
- [ ] Consistent terminology throughout
- [ ] Technical accuracy verified
- [ ] Code examples tested and working

### Code Examples
- [ ] Minimum of 3 code blocks total
- [ ] All code blocks have language tags (```typescript, ```tsx, etc.)
- [ ] TypeScript used throughout (not JavaScript)
- [ ] Arrow functions used for all Cubit/Bloc methods
- [ ] Proper types and interfaces defined
- [ ] Inline comments explain "why", not "what"
- [ ] Code is formatted consistently (Prettier)
- [ ] Examples are self-contained and understandable
- [ ] Examples progress from simple to complex

### MDX Components Usage
- [ ] `<DemoPreview demoId="..." />` embedded correctly
- [ ] At least 1 `<GuideArticleNote>` used appropriately
- [ ] Custom components imported when needed
- [ ] No HTML tags (use MDX components instead)
- [ ] Proper nesting of components

### Educational Value
- [ ] Explains both "how" and "why"
- [ ] Shows what NOT to do (anti-patterns)
- [ ] Includes real-world context
- [ ] Addresses common questions
- [ ] Builds on previous concepts appropriately
- [ ] Clear learning progression

## Technical Accuracy Checklist

### BlaC Concepts
- [ ] Correct usage of Cubit vs Bloc
- [ ] Arrow functions emphasized
- [ ] `emit()` vs `patch()` explained correctly
- [ ] Instance management patterns accurate
- [ ] Lifecycle concepts correct
- [ ] Plugin usage demonstrated properly

### TypeScript
- [ ] Proper interface definitions
- [ ] Generic types used correctly
- [ ] Type safety benefits highlighted
- [ ] No use of `any` type
- [ ] Proper import statements

### React Integration
- [ ] `useBloc` hook usage correct
- [ ] Component lifecycle integration accurate
- [ ] Re-rendering behavior explained correctly
- [ ] Best practices followed

## Style Guide Compliance

### Formatting
- [ ] Consistent heading hierarchy (## for main, ### for sub)
- [ ] Blank line before and after code blocks
- [ ] Bulleted lists properly formatted
- [ ] Proper spacing between sections
- [ ] No trailing whitespace

### Naming Conventions
- [ ] Class names use PascalCase
- [ ] Variable names use camelCase
- [ ] File names use kebab-case
- [ ] Component names descriptive and clear

### Links and References
- [ ] Internal links use correct paths
- [ ] Related demos listed in bottom section
- [ ] External links open in new tab (when applicable)
- [ ] All links tested and working

## User Experience Checklist

### Readability
- [ ] Article length appropriate (800-1500 words)
- [ ] Scannable structure (headers, bullets, callouts)
- [ ] Code-to-text ratio balanced
- [ ] Visual hierarchy clear
- [ ] No walls of text

### Navigation
- [ ] Breadcrumbs work correctly
- [ ] Previous/Next navigation appropriate
- [ ] Related demos easy to find
- [ ] Internal links contextual and helpful

### Engagement
- [ ] Live demo embedded and functional
- [ ] Interactive elements encourage exploration
- [ ] Clear call-to-action for next steps
- [ ] Questions or challenges posed when appropriate

## Accessibility Checklist

- [ ] Code examples have sufficient contrast
- [ ] Headings follow semantic hierarchy
- [ ] Alt text for images (if any)
- [ ] Color not sole indicator of meaning
- [ ] Clear focus indicators on interactive elements

## Cross-Browser/Device Checklist

- [ ] Code blocks don't overflow on mobile
- [ ] DemoPreview renders correctly on all devices
- [ ] Navigation works on touch devices
- [ ] Text readable at different zoom levels
- [ ] No horizontal scrolling required

## Final Review Checklist

### Self-Review
- [ ] Read article from beginning to end
- [ ] Follow along with code examples
- [ ] Click all links to verify they work
- [ ] Test live demo to ensure it's functional
- [ ] Check for typos and grammar issues

### Peer Review
- [ ] Have another developer review
- [ ] Verify technical accuracy
- [ ] Check for clarity and comprehension
- [ ] Ensure consistency with other articles

### User Testing
- [ ] Test with someone unfamiliar with the topic
- [ ] Verify they can follow along
- [ ] Address any confusion or questions
- [ ] Incorporate feedback

## Pre-Publish Checklist

- [ ] All checklist items above completed
- [ ] Article follows template structure
- [ ] Code examples tested in current BlaC version
- [ ] Screenshots/images optimized (if any)
- [ ] Metadata correct (demoId, sectionId)
- [ ] Related demos verified to exist
- [ ] Links tested one final time
- [ ] Git commit with clear message
- [ ] PR created with description of changes

## Post-Publish Checklist

- [ ] Article renders correctly in production
- [ ] Demo embed works in production
- [ ] Links work in production
- [ ] Syntax highlighting displays correctly
- [ ] Mobile view checked
- [ ] Navigation to/from article works
- [ ] Monitor for user feedback/issues

---

## Quick Quality Grades

Use this as a quick gut-check:

### Grade A (Excellent)
- All required sections present and complete
- 3+ code examples with clear explanations
- Live demo integrated seamlessly
- Anti-patterns or pitfalls addressed
- Real-world examples included
- Multiple GuideArticleNote callouts
- 1000+ words of quality content

### Grade B (Good)
- Required sections present
- 2-3 code examples
- Live demo included
- Basic explanations clear
- Some callouts present
- 800-1000 words

### Grade C (Acceptable)
- Most required sections present
- 2+ code examples
- Demo mentioned or linked
- Basic information covered
- 500-800 words

### Grade D (Needs Work)
- Missing required sections
- Minimal code examples
- No demo integration
- Unclear explanations
- <500 words

### Grade F (Unacceptable)
- Placeholder content
- No code examples
- No structure
- Inaccurate information
- <200 words

---

## Notes for Reviewers

When reviewing an article, focus on:

1. **Accuracy**: Is the technical information correct?
2. **Clarity**: Will a beginner understand this?
3. **Completeness**: Does it cover the topic thoroughly?
4. **Consistency**: Does it match the style of other articles?
5. **Value**: Will users learn something useful?

Provide specific, actionable feedback:
- ❌ "This section is confusing"
- ✅ "The 'Common Pitfalls' section should include an example of why arrow functions are required"

---

## Template Usage Notes

1. Copy `_article-template.mdx` to new file
2. Replace ALL_CAPS placeholders
3. Remove sections that don't apply
4. Work through checklist as you write
5. Review checklist before submitting

Remember: Quality over speed. A well-crafted article helps thousands of developers.
