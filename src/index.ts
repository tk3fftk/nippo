import { Client, isFullPage } from "@notionhq/client";
import { Toggl } from "toggl-track";
import dotenv from "dotenv";

dotenv.config();

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});
const databaseId = process.env.NOTION_DATABASE_ID || "";

const today = new Date();
today.setHours(0, 0, 0, 0);
const yesterday = new Date(today);
yesterday.setDate(yesterday.getDate() - 1);

async function createPageInNotion() {
  const todayString = `${today.getFullYear()}-${String(
    today.getMonth() + 1,
  ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

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
    console.log(`${todayString} page has been created.`);
  }
}

async function addBlockToNotion(text: object) {
  const yesterdayString = `${yesterday.getFullYear()}-${String(
    yesterday.getMonth() + 1,
  ).padStart(2, "0")}-${String(yesterday.getDate() - 1).padStart(2, "0")}`;

  const response = await notion.databases.query({
    database_id: databaseId,
    filter: {
      property: "Date",
      date: {
        equals: yesterdayString,
      },
    },
  });
  const yesterdayPageId = response.results[0].id;

  let paragraphText = "";
  for (const [k, v] of Object.entries(text)) {
    paragraphText += `${k}: ${v}\n`;
  }

  await notion.blocks.children.append({
    block_id: yesterdayPageId,
    children: [
      {
        object: "block",
        type: "heading_2",
        heading_2: {
          rich_text: [
            {
              type: "text",
              text: {
                content: "today's toggl track",
              },
            },
          ],
        },
      },
      {
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [
            {
              type: "text",
              text: {
                content: paragraphText,
              },
            },
          ],
        },
      },
    ],
  });
}

async function getItemsFromToggl(): Promise<object> {
  const toggl = new Toggl({
    auth: {
      token: process.env.TOGGL_TRACK_API_TOKEN || "",
    },
  });

  const entries = await toggl.timeEntry.list({
    startDate: yesterday.toISOString(),
    endDate: today.toISOString(),
  });

  // format is "description: minutes"
  const reduced: { [key: string]: number } = entries.reduce(
    (accumulator: any, currentValue: any) => {
      if (!accumulator[currentValue.description]) {
        accumulator[currentValue.description] = 0;
      }
      accumulator[currentValue.description] += Math.round(
        currentValue.duration / 60,
      );
      return accumulator;
    },
    {},
  );

  return reduced;
}

createPageInNotion()
  .then(() => getItemsFromToggl())
  .then((reduced) => addBlockToNotion(reduced))
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
