module.exports = {
  extends: ["@commitlint/config-conventional"],
  plugins: [
    {
      rules: {
        // Reject multi-scopes like "fix(node-sdk,python-sdk):" — release-please
        // only recognises a single scope per commit and silently ignores the rest.
        // Use separate commits for each scope instead.
        "scope-no-multi": ({ scope }) => {
          if (scope && scope.includes(",")) {
            return [
              false,
              "scope must not contain multiple values separated by commas — " +
                "release-please requires one scope per commit. " +
                "Use separate commits for each SDK instead.",
            ];
          }
          return [true];
        },
      },
    },
  ],
  rules: {
    // Reject comma-separated multi-scopes (see plugin above)
    "scope-no-multi": [2, "always"],
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
        "browser-examples", // Browser example code
        "ci", // CI/CD changes
        "deps", // Dependency updates
        "release", // Release configuration
        "docs", // Documentation
      ],
    ],
    // Allow commits without scope for cross-cutting changes
    "scope-empty": [0, "never"],
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
    // Enforce reasonable header length
    "header-max-length": [2, "always", 100],
    // Enforce lowercase subject for consistency
    "subject-case": [2, "always", "lower-case"],
  },
};
