import { Client, isFullPage } from "@notionhq/client";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  const today = new Date();
  const todayString = `${today.getFullYear()}/${
    today.getMonth() + 1
  }/${today.getDate()}`;

  const notion = new Client({
    auth: process.env.NOTION_TOKEN,
  });
  const databaseId = process.env.NOTION_DATABASE_ID || "";

  const response = await notion.databases.query({
    database_id: databaseId,
  });

  const createPageResponse = await notion.pages.create({
    parent: {
      database_id: databaseId,
    },
    properties: {
      Name: {
        title: [
          {
            text: {
              content: todayString,
            },
          },
        ],
      },
      Date: {
        type: "date",
        date: {
          start: today.toISOString(),
          end: null,
        },
      },
    },
  });

  if (isFullPage(createPageResponse)) {
    console.log("today's page has been created.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
