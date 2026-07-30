from telegram import Update
from telegram.ext import Application, MessageHandler, ContextTypes, filters

TOKEN = "8890738033:AAE0mlWbGA5bO79QtsbmF9O8dmK5G4VLDR4"

async def reply(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("👇")

app = Application.builder().token(TOKEN).build()

app.add_handler(MessageHandler(filters.ALL, reply))

print("Бот запущен...")
app.run_polling()
