import KioskDisplay from "@/components/kiosk/KioskDisplay";
import { getKioskData } from "@/lib/kiosk-data";

export default async function KioskPage() {
  const data = await getKioskData();

  return (
    <KioskDisplay
      topStudents={data.topStudents}
      substitutions={data.substitutions}
      announcements={data.announcements}
    />
  );
}
