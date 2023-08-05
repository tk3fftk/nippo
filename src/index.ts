import { Client, isFullPage } from "@notionhq/client";
import { Toggl } from "toggl-track";
import dotenv from "dotenv";

dotenv.config();

const today = new Date();
today.setHours(0, 0, 0, 0);

async function createPageInNotion() {
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

async function getItemsFromToggl(): Promise<any> {
  const toggl = new Toggl({
    auth: {
      token: process.env.TOGGL_TRACK_API_TOKEN || "",
    },
  });
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const entries = await toggl.timeEntry.list({
    startDate: yesterday.toISOString(),
    endDate: today.toISOString(),
  });

  // description: minutes
  const reduced = entries.reduce((accumulator: any, currentValue: any) => {
    if (!accumulator[currentValue.description]) {
      accumulator[currentValue.description] = 0;
    }
    accumulator[currentValue.description] += Math.round(
      currentValue.duration / 60
    );
    return accumulator;
  }, {});
  console.log(reduced);

  return reduced;
}

getItemsFromToggl()
  .then((reduced) => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
