export function getTimestampString() {
	const currentDate = new Date();
	const year = currentDate.getFullYear();
	const month = currentDate.getMonth() + 1;
	const day = currentDate.getDate();
	const hour = currentDate.getHours();
	const min = currentDate.getMinutes();
	const sec = currentDate.getSeconds();

	return String(year) +
		String(month).padStart(2, "0") +
		String(day).padStart(2, "0") +
		String(hour).padStart(2, "0") +
		String(min).padStart(2, "0") +
		String(sec).padStart(2, "0");
}

export interface Settings {
	provider?: {order: string[], require_parameters: boolean};
	provider_order?: string;
	model: string;
	url: string;
	api_key?: string;
	temperature: number;
	top_p: number;
	min_p: number;
	repetition_penalty: number;
	max_tokens?: number;
	max_completion_tokens?: number;
	response_format?: {type: string, json_schema?: object};
	response_format_type?: string;
}
