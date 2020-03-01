// Best-effort machine identifier
export const clientUUID = localStorage.getItem("clientUUID") || generate();
localStorage.setItem("clientUUID", clientUUID);

export function generate(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(16));
	return (
		(0x100 + (bytes[0])).toString(16).substr(1) +
		(0x100 + (bytes[1])).toString(16).substr(1) +
		(0x100 + (bytes[2])).toString(16).substr(1) +
		(0x100 + (bytes[3])).toString(16).substr(1) + "-" +
		(0x100 + (bytes[4])).toString(16).substr(1) +
		(0x100 + (bytes[5])).toString(16).substr(1) + "-" +
		// tslint:disable-next-line: no-bitwise
		(0x100 + ((bytes[6] & 0x0F) | 0x40)).toString(16).substr(1) +
		(0x100 + (bytes[7])).toString(16).substr(1) + "-" +
		// tslint:disable-next-line: no-bitwise
		(0x100 + ((bytes[8] & 0x3F) | 0x80)).toString(16).substr(1) +
		(0x100 + (bytes[9])).toString(16).substr(1) + "-" +
		(0x100 + (bytes[10])).toString(16).substr(1) +
		(0x100 + (bytes[11])).toString(16).substr(1) +
		(0x100 + (bytes[12])).toString(16).substr(1) +
		(0x100 + (bytes[13])).toString(16).substr(1) +
		(0x100 + (bytes[14])).toString(16).substr(1) +
		(0x100 + (bytes[15])).toString(16).substr(1)
	);
}
