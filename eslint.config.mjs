import typescriptEslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


import { includeIgnoreFile } from "@eslint/compat";
const gitignorePath = path.resolve(__dirname, ".tslintignore");


const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default [
    includeIgnoreFile(gitignorePath),
    ...compat.extends("eslint:recommended", "plugin:@typescript-eslint/recommended"),
    {
        plugins: {
            "@typescript-eslint": typescriptEslint,
        },

        languageOptions: {
            parser: tsParser,
        },

        rules: {
            // Отключаем все правила, кроме @typescript-eslint/no-explicit-any
            "no-unused-vars": "off",
            "no-undef": "off",
            "@typescript-eslint/explicit-module-boundary-types": "off",
            "@typescript-eslint/explicit-function-return-type": "off",
            "@typescript-eslint/no-unused-vars": "off",
            "@typescript-eslint/no-var-requires": "off",
            "@typescript-eslint/ban-ts-comment": "off",
            "@typescript-eslint/ban-types": "off",
            "@typescript-eslint/no-require-imports": "off",
            "prefer-const": "off",
            "@typescript-eslint/prefer-as-const": "off",
            "@typescript-eslint/no-empty-object-type": "off",
            "@typescript-eslint/no-unused-expressions": "off",
            "prefer-rest-params": "off",
            "no-prototype-builtins": "off",
            "no-useless-escape": "off",
            "@typescript-eslint/triple-slash-reference": "off",
            "no-sparse-arrays": "off",
            "no-unexpected-multiline": "off",

            // Enable warn
            "no-var": "warn",
            "@typescript-eslint/no-explicit-any": "warn",
        },
    },
];
