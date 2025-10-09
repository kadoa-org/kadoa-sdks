module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // Enforce scope to match our monorepo structure
    "scope-enum": [
      2,
      "always",
      [
        "spec", // OpenAPI spec updates
        "node-sdk", // Node SDK changes
        "python-sdk", // Python SDK changes
        "codegen", // Code generation tooling
        "node-examples", // Node example code
        "python-examples", // Python example code
        "ci", // CI/CD changes
        "deps", // Dependency updates
        "release", // Release configuration
        "docs", // Documentation
        "*", // Allow wildcard for cross-cutting changes
      ],
    ],
    // Ensure type matches what Release Please expects
    "type-enum": [
      2,
      "always",
      [
        "feat", // Triggers minor release
        "fix", // Triggers patch release
        "docs", // Documentation only
        "style", // Code style
        "refactor", // Code refactoring
        "perf", // Performance improvements
        "test", // Test changes
        "build", // Build system
        "ci", // CI/CD
        "chore", // Maintenance
        "revert", // Revert commits
      ],
    ],
  },
};
