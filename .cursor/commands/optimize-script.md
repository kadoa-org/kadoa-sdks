# Optimize Script

Review and optimize the script(s) provided in context according to the local scripts guidelines.

## Review Checklist

1. **Check compliance with `.cursor/rules/local-scripts.mdc` guidelines**:
   - Verify naming conventions (kebab-case, descriptive names with action verbs)
   - Ensure script is in correct location (`scripts/.local/`)
   - Check for proper documentation on reusable functions

2. **Identify reusable functions to extract**:
   - Functions that could be used by other scripts
   - Common patterns (API calls, database connections, data transformations)
   - Extract to `scripts/.local/utils/` or `scripts/.local/lib/` as appropriate

3. **Check for duplicate code**:
   - Review `scripts/.local/utils/` and `scripts/.local/lib/` for existing utilities
   - Replace duplicate implementations with imports from existing utilities
   - Ensure progressive discovery pattern is followed

4. **Verify imports and composition**:
   - Check if script imports from existing utilities (`utils/`, `lib/`)
   - Ensure database connections use `getSupabaseClient()` from `utils/database.ts`
   - Ensure API calls use `callPublicAPI()` or `callOperationsAPI()` from `utils/api.ts`
   - Verify script composes functions rather than duplicating logic

5. **Review code quality**:
   - Check for proper error handling
   - Verify consistent code style
   - Ensure proper TypeScript types
   - Check for linting issues

## Output Format

Provide:
1. **Summary**: Brief overview of findings
2. **Issues Found**: List specific issues with file paths and line numbers
3. **Suggestions**: Actionable recommendations with code examples
4. **Proposed Changes**: Specific refactoring suggestions (extract functions, update imports, etc.)

## Action Items

- Extract reusable functions to appropriate utility files
- Update imports to use existing utilities
- Remove duplicate code
- Fix naming convention violations
- Improve code organization and structure

Apply fixes automatically where appropriate, but ask for confirmation before making significant structural changes.

