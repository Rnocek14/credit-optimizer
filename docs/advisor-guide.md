# EduTree V4 Advisor Guide

## Overview

EduTree V4 is a visual degree planning tool with integrated policy compliance checking designed to help advisors review and validate student degree plans efficiently.

## Key Features for Advisors

### Real-Time Policy Validation
- **Transfer Cap Enforcement**: Automatically flags plans exceeding 60 transfer credits
- **Residency Requirements**: Ensures minimum 30 credits completed in residence
- **Articulation Checking**: Validates Florida articulation agreements
- **Expiration Tracking**: Identifies expired science/math credits (>7 years old)

### Compliance Scoring
- **Overall Score (0-100%)**: Composite metric of policy adherence
- **Category Breakdown**: Credits by Core CS, Math, Gen Ed, Electives, Capstone
- **Violation Summary**: Errors (must fix) vs. Warnings (recommendations)

## Reviewing Student Plans

### Visual Indicators

**Year Nodes (Spine)**
- Show total credits planned per year
- Color-coded load health:
  - Red: Overloaded (>36 credits)
  - Amber: Underloaded (<24 credits)
  - Green: Balanced (24-36 credits)

**Course Nodes**
- Category badges (💻 Core, 📐 Math, 📚 Gen Ed, etc.)
- Policy badges:
  - ✅ Articulated: Guaranteed transfer
  - ⚠️ Non-Transfer: Doesn't count toward transfer limit
  - 🛒 Marketplace: Alternative provider selected

**Module Cards**
- Group courses by sub-requirement
- Show completion progress
- Expandable for detailed course lists

### Interpreting Compliance Scores

**90-100%**: Excellent - Plan meets all requirements
- May have minor warnings
- Ready for approval

**70-89%**: Good - Minor issues to address
- Check warnings in detail
- May need small adjustments

**50-69%**: Needs Work - Moderate issues
- Review errors carefully
- Student may need to swap courses
- Schedule follow-up meeting

**Below 50%**: Significant Issues
- Major policy violations
- Likely exceeds transfer caps or missing critical requirements
- Requires plan redesign

## Common Policy Issues

### Transfer Cap Violations
**Issue**: Student exceeds 60 transfer credits
**Solution**:
- Identify which transfer courses are least critical
- Suggest completing those courses in residence instead
- Check if any CLEP exams can be replaced with traditional courses

### Missing Articulation
**Issue**: Transfer course lacks guaranteed articulation agreement
**Solution**:
- Check FloridaShines.org for manual verification
- If not found, recommend student take equivalent in residence
- Document exception if accepting non-articulated transfer

### Expired Credits
**Issue**: Science/math courses >7 years old
**Solution**:
- Verify with department if credit is still valid
- For STEM courses, may require re-taking or proficiency exam
- Document waiver if approved by department

### Residency Shortfall
**Issue**: Plan has <30 credits completed in residence
**Solution**:
- Ensure capstone courses are in residence
- Recommend converting some transfer courses to in-residence
- Verify all upper-level (300/400) courses in major are in residence

## Using Export Features

### PDF Compliance Report
Generated reports include:
1. Student name and export date
2. Overall compliance score
3. Transfer credit usage (X/60)
4. Residency credit status (X/30)
5. Category breakdown (Core CS, Math, Gen Ed, etc.)
6. Module-by-module completion status
7. **Policy violations** (errors and warnings)
8. Florida articulation mappings

**Best Practice**: Export before and after advising sessions to track changes.

### Share Links
- Students can generate shareable links to their plans
- View-only access for advisors
- Useful for asynchronous review or multi-advisor consultations

## Florida Articulation Reference

### Common Articulation Agreements
- **valencia-ucf-001**: Valencia College → UCF (all AS degrees)
- **spc-ucf-001**: St. Petersburg College → UCF (CS/IT tracks)
- **mdc-ucf-001**: Miami Dade College → UCF (General AA)

### Verifying Articulation
1. Look for "✅ Articulated" badge on course node
2. Hover over badge to see articulation ID
3. Cross-reference with FloridaShines if uncertain
4. Note transfer rate (e.g., 1.0 = full credit, 0.75 = partial credit)

### When Articulation is Missing
- Check if course is equivalent but not formally articulated
- Consult department for case-by-case approval
- Document decision in student notes
- Consider suggesting alternative course with articulation

## Marketplace Courses

### What are Marketplace Courses?
- Courses from platforms like Coursera, edX, CLEP, etc.
- Indicated by 🛒 badge
- May or may not be transferable depending on accreditation

### Advising on Marketplace Selections

**Transferable (✅ Articulated)**
- Safe to approve if articulation agreement exists
- Example: CLEP Calculus → MATH 151

**Non-Transferable (⚠️ Non-Transfer)**
- Requires special approval
- May count for knowledge/skills but not credit toward degree
- Recommend for supplemental learning, not degree completion
- Document exception if allowing for credit

## Override Procedures (Future Feature)

*Note: Manual policy overrides not yet implemented in V4*

When override capability is added, advisors will be able to:
- Waive transfer cap for exceptional cases
- Accept expired credits with department approval
- Allow non-articulated transfers with documentation
- All overrides will be logged for audit trail

## Edge Cases & FAQ

**Q: Student has 61 transfer credits but all are articulated. Can I approve?**
A: No. Florida state policy caps transfer at 60 credits regardless of articulation. Student must convert 1 course to in-residence.

**Q: Can students complete capstone entirely online/transfer?**
A: No. Capstone courses typically require residency. Check specific program requirements.

**Q: Student took CS course at non-accredited bootcamp. Can it transfer?**
A: Generally no, unless the bootcamp has a formal articulation with your institution. Recommend portfolio review or proficiency exam instead.

**Q: How do I handle AP/IB credits?**
A: AP/IB credits count toward transfer cap. Treat them as exam-based transfers. Use "exam" as source type.

**Q: Student is close to 120 credits but missing required category. What do I do?**
A: Check "Missing Requirements" section in Degree Progress Panel. Ensure all category minimums are met, not just total credits.

## Best Practices

1. **Review Compliance Panel First**: Start with overall score to identify major issues
2. **Check Transfer Limit Early**: Transfer cap is the most common violation
3. **Verify Articulation**: Don't assume all community college courses transfer
4. **Balance Course Load**: Warn students about overloading (>18 credits/semester)
5. **Export Before Approving**: Keep PDF record of final approved plan
6. **Follow Up on Warnings**: Even if errors are resolved, review warnings for optimization

## Support & Escalation

For technical issues or policy questions not covered in this guide:
- Contact EduTree support team
- Consult institutional policy handbook
- Escalate to department chair for exceptional cases

---

Last updated: {{ current_date }}
