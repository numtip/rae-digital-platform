"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Shared feedback for the CMS desks: one persistent inline error, and one confirmation before the status moves
// that readers notice (going live, retiring, archiving, cancelling). Each desk keeps its own copy for its own
// labels; only the generic wording lives here, in Thai and English. The toast host is mounted once on the page.
type Locale = "th" | "en";

export const FEEDBACK = {
  th: {
    errorTitle: "ทำรายการไม่สำเร็จ", keep: "คงไว้ตามเดิม", saved: "บันทึกแล้ว", statusChanged: "เปลี่ยนสถานะแล้ว",
    published: { title: "เผยแพร่รายการนี้?", body: "รายการจะแสดงบนเว็บไซต์สาธารณะทันที", action: "เผยแพร่" },
    archived: { title: "เก็บถาวรรายการนี้?", body: "รายการจะถูกซ่อนจากเว็บไซต์สาธารณะ และไม่ถูกลบ", action: "เก็บถาวร" },
    cancelled: { title: "ยกเลิกกิจกรรมนี้?", body: "กิจกรรมจะยังแสดงบนเว็บไซต์พร้อมป้าย \"ยกเลิก\"", action: "ยกเลิกกิจกรรม" },
  },
  en: {
    errorTitle: "Could not complete the action", keep: "Keep as is", saved: "Saved", statusChanged: "Status changed",
    published: { title: "Publish this item?", body: "It goes live on the public website right away.", action: "Publish" },
    archived: { title: "Archive this item?", body: "It will be hidden from the public website. Nothing is deleted.", action: "Archive" },
    cancelled: { title: "Cancel this event?", body: "The event stays on the website with a \"Cancelled\" badge.", action: "Cancel the event" },
  },
} as const;

export type ConfirmStatus = "published" | "archived" | "cancelled";
export const needsConfirm = (status: string): status is ConfirmStatus => status === "published" || status === "archived" || status === "cancelled";

export function DeskError({ locale, message }: { locale: Locale; message: string }) {
  if (!message) return null;
  return (
    <Alert className="mt-2" variant="destructive">
      <AlertTitle>{FEEDBACK[locale].errorTitle}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

export function StatusConfirm({
  locale, pending, onCancel, onConfirm,
}: {
  locale: Locale;
  pending: { code: string; status: ConfirmStatus } | null;
  onCancel: () => void;
  onConfirm: (code: string, status: ConfirmStatus) => void;
}) {
  const copy = FEEDBACK[locale];
  const text = pending ? copy[pending.status] : copy.published;
  return (
    <AlertDialog onOpenChange={(open) => { if (!open) onCancel(); }} open={pending !== null}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{text.title}</AlertDialogTitle>
          <AlertDialogDescription>{text.body}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{copy.keep}</AlertDialogCancel>
          <AlertDialogAction onClick={() => { if (pending) onConfirm(pending.code, pending.status); }}>{text.action}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
