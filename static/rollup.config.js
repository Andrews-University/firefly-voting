import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import alias from "@rollup/plugin-alias";
import { createFilter } from "@rollup/pluginutils";
import surplusCompiler from "surplus/compiler";

function surplus({ include, exclude, sourceMap = false }) {
	const filter = createFilter(include, exclude);
	return {
		name: "surplus",

		transform(code, id) {
			if(!filter(id)) return null;
			const result = surplusCompiler.compile(code, sourceMap ? { sourcemap: "extract" } : false);
			return {
				code: sourceMap ? result.src : result,
				map: sourceMap ? result.map : null
			};
		}
	}
};
const plugins = () => [
	typescript({ include: ['*.ts+(|x)', '**/*.ts+(|x)', '../src/events.ts'], exclude: ['*.d.ts', '**/*.d.ts'] }),
	surplus({ include: [ "*.tsx", "**/*.tsx", "*.jsx", "**/*.jsx" ], sourceMap: true }),
	alias({
		entries: [
			{ find: 'socket.io-client', replacement: "node_modules/socket.io-client/dist/socket.io.dev.js" },
		]
	}),
	resolve({
		main: false,
		browser: true,
		preferBuiltins: false,

	}),
	commonjs({
		include: /node_modules/,
	}),
]

export default [
	{
		input: "src/client.ts",
		output: {
			format: "iife",
			file: "client.js",
			name: "client",
			sourcemap: true,
		},
		plugins: plugins()
	},
	{
		input: "src/chat.ts",
		output: {
			format: "iife",
			file: "chat.js",
			name: "chat",
			sourcemap: true,
		},
		plugins: plugins()
	},
	{
		input: "src/admin.tsx",
		output: {
			format: "iife",
			file: "admin.js",
			name: "admin",
			sourcemap: true,
		},
		plugins: plugins()
	},
	{
		input: "src/monitor.tsx",
		output: {
			format: "iife",
			file: "monitor.js",
			name: "monitor",
			sourcemap: true,
		},
		plugins: plugins()
	}
];
