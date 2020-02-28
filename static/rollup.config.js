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

export default {
	input: "src/index.ts",
	output: {
		format: "iife",
		file: "index.js",
		name: "client",
		sourcemap: true,
	},
	plugins: [
		typescript({ include: [ "*.ts(|x)", "**/*.ts(|x)" ] }),
		surplus({ include: [ "*.tsx", "**/*.tsx" ], sourceMap: true }),
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
};
