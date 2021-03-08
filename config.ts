/**
 * Event identifiers used to denote message types. There's no security advantage
 * to using random event identifiers, merely obfuscation.
 */
export declare const enum Event {
	State = "65996b32-0f72-4522-a6ee-8266464628b8",
	Stats = "1c3a80d6-8210-40de-8a25-e6ed32793d95",
	Info = "294bd6f6-280c-4a76-822c-f56783b7dab2",
	Signon = "52f21ebc-57d9-4add-afac-fb59c0573d3f",
	Admin = "fa84d8be-37ef-4da1-b7dc-66c4bda1dc7d",
	Vote = "782d7a0d-701a-4ae2-841b-442fd6009a11"
}

/**
 * Secrets that are shared between specific clients and the server.
 *
 * WARNING: The enum below *MUST* be declare const, otherwise these secrets
 * might leak to all clients.
 */
export declare const enum Secret {
	MonitorSignon = "ae0508da-9120-4ba2-b7e5-eeec0ed73af1",
	AdminSignon = "c1123695-6422-41f8-8bc6-ee31768ebe95"
}
