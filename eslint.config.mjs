import pluginSecurity from 'eslint-plugin-security';
import securityNode from 'eslint-plugin-security-node';
import eslintPluginNoUnsanitized from 'eslint-plugin-no-unsanitized';

export default [
    {
        files: ['**/*.js'],
        ignores: ['**/node_modules/**', '**/reports/**', '**/ssl/**'],
        plugins: {
            security: pluginSecurity,
            'security-node': securityNode,
            'no-unsanitized': eslintPluginNoUnsanitized,
        },
        rules: {
            ...pluginSecurity.configs.recommended.rules,
            ...securityNode.configs.recommended.rules,
            ...eslintPluginNoUnsanitized.configs.recommended.rules,
            // False positive: we only log internal status, never user-controlled data
            'security-node/detect-crlf': 'off',
        },
        languageOptions: {
            globals: {
                console: true,
                process: true,
                require: true,
                module: true,
                __dirname: true,
                __filename: true,
                Buffer: true,
                setTimeout: true,
                clearTimeout: true,
                setInterval: true,
                clearInterval: true,
            },
        },
    },
    {
        files: ['**/*.test.js'],
        plugins: {
            security: pluginSecurity,
        },
        rules: {
            'security/detect-object-injection': 'off',
        },
    },
];
