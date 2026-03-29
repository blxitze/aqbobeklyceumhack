import NotificationComposer from "@/components/admin/NotificationComposer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function targetLabel(targetRole: string | null, targetClassName: string | null): string {
  if (targetClassName) return `Класс ${targetClassName}`;
  if (targetRole === "STUDENT") return "Только ученики";
  if (targetRole === "TEACHER") return "Только учителя";
  if (targetRole === "PARENT") return "Только родители";
  return "Все";
}

export default async function AdminNotifications() {
  await requireAuth("ADMIN");

  const [notifications, classes] = await Promise.all([
    prisma.notification.findMany({
      include: { targetClass: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    prisma.class.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Центр уведомлений</h1>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Отправленные уведомления</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground">Уведомлений пока нет</p>
            ) : (
              notifications.map((notification) => (
                <div key={notification.id} className="rounded-md border p-3 text-sm">
                  <p className="font-semibold">{notification.title}</p>
                  <p className="mt-1 text-muted-foreground">{notification.body}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {targetLabel(notification.targetRole, notification.targetClass?.name ?? null)} •{" "}
                    {new Intl.DateTimeFormat("ru-RU", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(notification.createdAt)}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Создать уведомление</CardTitle>
          </CardHeader>
          <CardContent>
            <NotificationComposer classes={classes} />
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
