import { getEol } from "../env";
import { surroundBlockSelection } from "../editorHelpers";

const newLine = getEol();

const startingshadebox: string = `>[!BEGINSHADEBOX]${newLine}`;
const endingshadebox: string = `>[!ENDSHADEBOX]${newLine}`;
const shadeboxBlockWordPattern: RegExp = new RegExp(
  startingshadebox + ".+" + endingshadebox + "|.+",
  "gm"
);

export function toggleShadebox() {
  return surroundBlockSelection(
    startingshadebox,
    endingshadebox,
    shadeboxBlockWordPattern
  );
}