import { IMonitor, INotificationChannel } from "../../../../db/v2/models/index.js";
import { IAlert, IMessageService } from "./IMessageService.js";
import got from "got";
import ApiError from "../../../../utils/ApiError.js";

const SERVICE_NAME = "TelegramServiceV2";

class TelegramService implements IMessageService {
	static SERVICE_NAME = SERVICE_NAME;

	constructor() {}

	buildAlert = (monitor: IMonitor) => {
		const name = monitor?.name || "Unnamed monitor";
		const monitorStatus = monitor?.status || "unknown status";
		const url = monitor?.url || "no URL";
		const checkTime = monitor?.lastCheckedAt || null;
		const alertTime = new Date();
		
		return {
			name,
			url,
			status: monitorStatus,
			checkTime,
			alertTime,
		};
	};

	sendMessage = async (alert: IAlert, channel: INotificationChannel) => {
		const botToken = channel?.config?.botToken;
		const chatId = channel?.config?.chatId;

		if (!botToken) {
			throw new ApiError("Telegram bot token not configured", 400);
		}

		if (!chatId) {
			throw new ApiError("Telegram chat ID not configured", 400);
		}

		try {
			// Format the message for Telegram
			const message = this.formatTelegramMessage(alert);
			
			const telegramApiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
			
			const payload = {
				chat_id: chatId,
				text: message,
				parse_mode: "Markdown",
				disable_web_page_preview: false,
			};

			const response = await got.post(telegramApiUrl, { 
				json: payload,
				timeout: 10000 // 10 second timeout
			});

			if (response.statusCode !== 200) {
				throw new Error(`Telegram API returned status ${response.statusCode}`);
			}

			return true;
		} catch (error) {
			console.warn("Failed to send Telegram message", error);
			return false;
		}
	};

	private formatTelegramMessage = (alert: IAlert): string => {
		const statusEmoji = alert.status === "up" ? "✅" : "❌";
		const statusText = alert.status === "up" ? "UP" : "DOWN";
		
		let message = `*${statusEmoji} Monitor Alert*\n\n`;
		message += `*Monitor:* ${alert.name}\n`;
		message += `*Status:* ${statusText}\n`;
		message += `*URL:* ${alert.url}\n`;
		
		if (alert.checkTime) {
			message += `*Last Check:* ${alert.checkTime.toISOString()}\n`;
		}
		
		message += `*Alert Time:* ${alert.alertTime.toISOString()}\n`;
		
		// Add details if available
		if (alert.details && Object.keys(alert.details).length > 0) {
			message += `\n*Details:*\n`;
			Object.entries(alert.details).forEach(([key, value]) => {
				message += `• ${key}: ${value}\n`;
			});
		}

		return message;
	};

	testMessage = async () => {
		return true;
	};
}

export default TelegramService;
