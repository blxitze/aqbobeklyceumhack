import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import PortfolioAddForm from "@/components/student/PortfolioAddForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { PortfolioItemType } from "@prisma/client";

function typeLabel(type: PortfolioItemType): string {
  switch (type) {
    case "CERTIFICATE":
      return "Сертификат";
    case "ACHIEVEMENT":
      return "Достижение";
    case "OLYMPIAD":
      return "Олимпиада";
    case "OTHER":
      return "Другое";
    default:
      return type;
  }
}

export default async function PortfolioPage() {
  const session = await requireAuth("STUDENT");
  const profile = await prisma.studentProfile.findFirst({
    where: { userId: session.user.id },
    include: {
      portfolioItems: {
        orderBy: { date: "desc" },
      },
    },
  });

  if (!profile) {
    return (
      <Card className="border-amber-200 bg-amber-50/70">
        <CardHeader>
          <CardTitle className="text-base">Профиль не найден</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Не удалось загрузить портфолио.</p>
        </CardContent>
      </Card>
    );
  }

  const items = profile.portfolioItems;

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Портфолио</h1>
          <p className="text-sm text-muted-foreground">Сертификаты и достижения</p>
        </div>
        <PortfolioAddForm />
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Пока нет записей. Добавьте достижение кнопкой выше.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <Card key={item.id} className="flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <CardTitle className="text-base leading-snug">{item.title}</CardTitle>
                  <span className="inline-flex shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {typeLabel(item.type)}
                  </span>
                </div>
                <CardDescription>
                  {new Intl.DateTimeFormat("ru-RU", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  }).format(item.date)}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{item.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
