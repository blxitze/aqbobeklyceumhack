import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, PortfolioItemType, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" }),
});

const CLASS_CONFIG = [
  { name: "10A", grade: 10 },
  { name: "10B", grade: 10 },
  { name: "11A", grade: 11 },
];

const SUBJECTS = [
  "Математика",
  "Физика",
  "Информатика",
  "История",
  "Биология",
] as const;

type GradeType = "CURRENT" | "SOR" | "SOC";
type PerformanceLevel = "struggling" | "excellent" | "average" | "mixed";

const QUARTERS = [1, 2, 3, 4] as const;
const SOR_MAX_SCORES = [10, 15, 20, 25] as const;
const SOC_MAX_SCORES = [20, 25, 30] as const;

const TOPICS_BY_SUBJECT: Record<
  string,
  Array<{ name: string; prerequisites: string[] }>
> = {
  Математика: [
    { name: "Алгебра", prerequisites: [] },
    { name: "Геометрия", prerequisites: [] },
    { name: "Тригонометрия", prerequisites: ["Геометрия"] },
    { name: "Производные", prerequisites: ["Алгебра"] },
    { name: "Интегралы", prerequisites: ["Производные"] },
    { name: "Вероятность", prerequisites: [] },
  ],
  Физика: [
    { name: "Механика", prerequisites: [] },
    { name: "Динамика", prerequisites: ["Механика"] },
    { name: "Электростатика", prerequisites: [] },
    { name: "Электромагнетизм", prerequisites: ["Электростатика"] },
    { name: "Оптика", prerequisites: [] },
    { name: "Термодинамика", prerequisites: [] },
  ],
  Информатика: [
    { name: "Алгоритмы", prerequisites: [] },
    { name: "Структуры данных", prerequisites: ["Алгоритмы"] },
    { name: "ООП", prerequisites: [] },
    { name: "Базы данных", prerequisites: ["ООП"] },
    { name: "Сети", prerequisites: [] },
    { name: "Веб-разработка", prerequisites: ["Сети"] },
  ],
  История: [
    { name: "Древний Казахстан", prerequisites: [] },
    { name: "Средневековье", prerequisites: [] },
    { name: "Новое время", prerequisites: [] },
    { name: "Советский период", prerequisites: [] },
    { name: "Независимость", prerequisites: [] },
    { name: "Современность", prerequisites: [] },
  ],
  Биология: [
    { name: "Клетка", prerequisites: [] },
    { name: "Генетика", prerequisites: ["Клетка"] },
    { name: "Эволюция", prerequisites: ["Генетика"] },
    { name: "Экология", prerequisites: [] },
    { name: "Анатомия", prerequisites: [] },
    { name: "Физиология", prerequisites: ["Анатомия"] },
  ],
};

const TEACHERS = [
  // Primary teachers
  { name: "Арман Тлеубергенов", subject: "Математика" },
  { name: "Сауле Омарова", subject: "Физика" },
  { name: "Ержан Нургалиев", subject: "Информатика" },
  { name: "Марина Кузнецова", subject: "История" },
  { name: "Гульмира Алимбекова", subject: "Биология" },
  // Substitute teachers
  { name: "Дамир Сейтжанов", subject: "Математика" },
  { name: "Айгуль Бекова", subject: "Физика" },
  { name: "Руслан Омаров", subject: "Информатика" },
  { name: "Зарина Ахметова", subject: "История" },
  { name: "Асель Нурланова", subject: "Биология" },
];

const FIRST_NAMES = [
  "Айгерим",
  "Нурлан",
  "Дамир",
  "Зарина",
  "Алибек",
  "Аружан",
  "Ерасыл",
  "Мадина",
  "Тимур",
  "Диана",
  "Жанель",
  "Адиль",
  "Сабина",
  "Руслан",
  "Асем",
  "Бекзат",
  "Камила",
  "Мирас",
  "Лаура",
  "Арсен",
  "Назерке",
  "Бауыржан",
  "Динара",
  "Мейрам",
  "Акниет",
  "Рустем",
  "Малика",
  "Санжар",
  "Инкар",
  "Самат",
];

const LAST_NAMES = [
  "Бекова",
  "Сейткали",
  "Ахметов",
  "Нурова",
  "Джаксыбеков",
  "Касымова",
  "Ибрагимов",
  "Турсынова",
  "Есимхан",
  "Омаров",
  "Кенжебаева",
  "Смагулов",
  "Жумабекова",
  "Сериков",
  "Досанова",
  "Аубакиров",
  "Жанибекова",
  "Муратов",
  "Абдрахманова",
  "Куанышев",
  "Мухамеджанова",
  "Тажибаев",
  "Садыкова",
  "Баймуханов",
  "Калиакпарова",
  "Абдуллин",
  "Ниязова",
  "Ермеков",
  "Сарсенбаева",
  "Рахимов",
];

function hashPassword(raw: string): string {
  return bcrypt.hashSync(raw, 10);
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDateWithinLast90Days(): Date {
  const now = Date.now();
  const daysAgo = randomInt(0, 89);
  const millis = randomInt(0, 86_399_999);
  return new Date(now - daysAgo * 24 * 60 * 60 * 1000 - millis);
}

function randomDateByQuarter(quarter: (typeof QUARTERS)[number]): Date {
  const quarterIndex = quarter - 1;
  const baseDaysAgo = (QUARTERS.length - 1 - quarterIndex) * 45;
  const daysAgo = baseDaysAgo + randomInt(0, 44);
  const millis = randomInt(0, 86_399_999);
  return new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000 - millis);
}

function pickRandom<T>(values: readonly T[]): T {
  return values[randomInt(0, values.length - 1)];
}

function scoreByPercentBand(maxScore: number, minPercent: number, maxPercent: number): number {
  const minScore = Math.max(0, Math.floor((maxScore * minPercent) / 100));
  const maxScoreBound = Math.min(maxScore, Math.ceil((maxScore * maxPercent) / 100));
  return randomInt(minScore, Math.max(minScore, maxScoreBound));
}

function scoreByPerformance(type: GradeType, maxScore: number, performance: PerformanceLevel): number {
  const effectivePerformance: Exclude<PerformanceLevel, "mixed"> =
    performance === "mixed" ? (Math.random() < 0.5 ? "excellent" : "struggling") : performance;
  const baseScore =
    type === "CURRENT"
      ? effectivePerformance === "struggling"
        ? randomInt(1, 5)
        : effectivePerformance === "excellent"
          ? randomInt(8, 10)
          : randomInt(5, 8)
      : type === "SOR"
        ? effectivePerformance === "struggling"
          ? scoreByPercentBand(maxScore, 30, 50)
          : effectivePerformance === "excellent"
            ? scoreByPercentBand(maxScore, 80, 100)
            : scoreByPercentBand(maxScore, 50, 75)
        : effectivePerformance === "struggling"
          ? scoreByPercentBand(maxScore, 25, 45)
          : effectivePerformance === "excellent"
            ? scoreByPercentBand(maxScore, 85, 100)
            : scoreByPercentBand(maxScore, 45, 70);
  const noise = randomInt(-Math.floor(maxScore * 0.1), Math.floor(maxScore * 0.1));
  return Math.max(0, Math.min(maxScore, baseScore + noise));
}

function buildStudentNames(count: number): string[] {
  const names = new Set<string>();
  let index = 0;

  while (names.size < count) {
    const first = FIRST_NAMES[index % FIRST_NAMES.length];
    const last = LAST_NAMES[Math.floor(index / FIRST_NAMES.length) % LAST_NAMES.length];
    names.add(`${first} ${last}`);
    index += 1;
  }

  return Array.from(names);
}

async function resetData() {
  await prisma.substitution.deleteMany();
  await prisma.scheduleSlot.deleteMany();
  await prisma.grade.deleteMany();
  await prisma.portfolioItem.deleteMany();
  await prisma.parentProfile.deleteMany();
  await prisma.studentProfile.deleteMany();
  await prisma.teacherProfile.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.topic.deleteMany();
  await prisma.class.deleteMany();
  await prisma.user.deleteMany();
}

async function main() {
  await resetData();

  const classes = await Promise.all(
    CLASS_CONFIG.map((classData) => prisma.class.create({ data: classData })),
  );

  await prisma.topic.createMany({
    data: SUBJECTS.flatMap((subject) =>
      TOPICS_BY_SUBJECT[subject].map((topic) => ({
        subject,
        name: topic.name,
        prerequisites: topic.prerequisites,
      })),
    ),
  });

  const teacherBySubject = new Map<string, { profileId: string; userId: string }>();

  for (let i = 0; i < TEACHERS.length; i += 1) {
    const teacher = TEACHERS[i];
    const teacherUser = await prisma.user.create({
      data: {
        email: `teacher${i + 1}@aqbobek.kz`,
        password: hashPassword("teacher123"),
        name: teacher.name,
        role: Role.TEACHER,
      },
    });

    const teacherProfile = await prisma.teacherProfile.create({
      data: {
        userId: teacherUser.id,
        subjects: [teacher.subject],
      },
    });

    teacherBySubject.set(teacher.subject, {
      profileId: teacherProfile.id,
      userId: teacherUser.id,
    });
  }

  const studentNames = buildStudentNames(75);
  const studentIndexes = Array.from({ length: studentNames.length }, (_, index) => index);
  for (let i = studentIndexes.length - 1; i > 0; i -= 1) {
    const j = randomInt(0, i);
    [studentIndexes[i], studentIndexes[j]] = [studentIndexes[j], studentIndexes[i]];
  }
  const strugglingCount = Math.round(studentNames.length * 0.15);
  const excellentCount = Math.round(studentNames.length * 0.2);
  const mixedCount = Math.round(studentNames.length * 0.15);
  const strugglingStudentIndexes = new Set(studentIndexes.slice(0, strugglingCount));
  const excellentStudentIndexes = new Set(
    studentIndexes.slice(strugglingCount, strugglingCount + excellentCount),
  );
  const mixedStudentIndexes = new Set(
    studentIndexes.slice(
      strugglingCount + excellentCount,
      strugglingCount + excellentCount + mixedCount,
    ),
  );

  const studentProfiles: Array<{
    id: string;
    classId: string;
    className: string;
    fullName: string;
  }> = [];

  let studentCounter = 0;
  let totalGradesCreated = 0;
  for (const currentClass of classes) {
    for (let i = 0; i < 25; i += 1) {
      const fullName = studentNames[studentCounter];

      const studentUser = await prisma.user.create({
        data: {
          email:
            studentCounter === 0
              ? "student@aqbobek.kz"
              : `student${String(studentCounter + 1).padStart(3, "0")}@aqbobek.kz`,
          password: hashPassword("student123"),
          name: fullName,
          role: Role.STUDENT,
        },
      });

      const studentProfile = await prisma.studentProfile.create({
        data: {
          userId: studentUser.id,
          classId: currentClass.id,
        },
      });

      await prisma.user.create({
        data: {
          email: `parent${String(studentCounter + 1).padStart(3, "0")}@aqbobek.kz`,
          password: hashPassword("parent123"),
          name: `${fullName.split(" ")[0]} ${fullName.split(" ")[1]}-а`,
          role: Role.PARENT,
          parentProfile: {
            create: {
              childId: studentProfile.id,
            },
          },
        },
      });

      const performance: PerformanceLevel = strugglingStudentIndexes.has(studentCounter)
        ? "struggling"
        : excellentStudentIndexes.has(studentCounter)
          ? "excellent"
          : mixedStudentIndexes.has(studentCounter)
            ? "mixed"
          : "average";
      const gradeRows = SUBJECTS.flatMap((subject) => {
        const topics = TOPICS_BY_SUBJECT[subject];
        const subjectPerformance: Exclude<PerformanceLevel, "mixed"> =
          performance === "mixed" ? (Math.random() < 0.5 ? "excellent" : "struggling") : performance;

        return QUARTERS.flatMap((quarter) => {
          const quarterRows: Array<{
            studentId: string;
            subject: string;
            topic: string;
            score: number;
            maxScore: number;
            type: GradeType;
            attendance: boolean;
            date: Date;
          }> = [];

          const hasMissingFo = Math.random() < 0.1;
          const foCount = hasMissingFo ? 0 : randomInt(3, 8);
          for (let foIndex = 0; foIndex < foCount; foIndex += 1) {
            const maxScore = 10;
            quarterRows.push({
              studentId: studentProfile.id,
              subject,
              topic: pickRandom(topics).name,
              score: scoreByPerformance("CURRENT", maxScore, subjectPerformance),
              maxScore,
              type: "CURRENT",
              attendance: Math.random() < (subjectPerformance === "struggling" ? 0.82 : 0.93),
              date: randomDateByQuarter(quarter),
            });
          }

          const sorCount = randomInt(1, 3);
          for (let sorIndex = 0; sorIndex < sorCount; sorIndex += 1) {
            const sorMax = pickRandom(SOR_MAX_SCORES);
            quarterRows.push({
              studentId: studentProfile.id,
              subject,
              topic: pickRandom(topics).name,
              score: scoreByPerformance("SOR", sorMax, subjectPerformance),
              maxScore: sorMax,
              type: "SOR",
              attendance: Math.random() < (subjectPerformance === "struggling" ? 0.82 : 0.93),
              date: randomDateByQuarter(quarter),
            });
          }

          const socMax = pickRandom(SOC_MAX_SCORES);
          quarterRows.push({
            studentId: studentProfile.id,
            subject,
            topic: pickRandom(topics).name,
            score: scoreByPerformance("SOC", socMax, subjectPerformance),
            maxScore: socMax,
            type: "SOC",
            attendance: Math.random() < (subjectPerformance === "struggling" ? 0.82 : 0.93),
            date: randomDateByQuarter(quarter),
          });

          return quarterRows;
        });
      });

      await prisma.grade.createMany({ data: gradeRows });
      totalGradesCreated += gradeRows.length;

      await prisma.portfolioItem.create({
        data: {
          studentId: studentProfile.id,
          title: "Учебное достижение",
          description: "Участие в школьном проекте",
          fileUrl: null,
          type: PortfolioItemType.ACHIEVEMENT,
          date: randomDateWithinLast90Days(),
        },
      });

      studentProfiles.push({
        id: studentProfile.id,
        classId: currentClass.id,
        className: currentClass.name,
        fullName,
      });

      studentCounter += 1;
    }
  }

  const rooms = ["101", "102", "103", "104", "105"];
  const slotsToCreate: Array<{
    classId: string;
    teacherId: string;
    subject: string;
    room: string;
    dayOfWeek: number;
    timeSlot: number;
  }> = [];

  for (let dayOfWeek = 1; dayOfWeek <= 5; dayOfWeek += 1) {
    for (let timeSlot = 1; timeSlot <= 6; timeSlot += 1) {
      const usedTeacherIds = new Set<string>();
      const usedRooms = new Set<string>();

      for (let classIndex = 0; classIndex < classes.length; classIndex += 1) {
        let subjectIndex = (dayOfWeek + timeSlot + classIndex) % SUBJECTS.length;

        while (
          usedTeacherIds.has(
            teacherBySubject.get(SUBJECTS[subjectIndex])?.profileId ?? "",
          )
        ) {
          subjectIndex = (subjectIndex + 1) % SUBJECTS.length;
        }

        const subject = SUBJECTS[subjectIndex];
        const teacher = teacherBySubject.get(subject);
        if (!teacher) throw new Error(`Teacher not found for subject ${subject}`);

        let room = rooms[classIndex];
        let roomIndex = classIndex;
        while (usedRooms.has(room)) {
          roomIndex = (roomIndex + 1) % rooms.length;
          room = rooms[roomIndex];
        }

        usedTeacherIds.add(teacher.profileId);
        usedRooms.add(room);

        slotsToCreate.push({
          classId: classes[classIndex].id,
          teacherId: teacher.profileId,
          subject,
          room,
          dayOfWeek,
          timeSlot,
        });
      }
    }
  }

  await prisma.scheduleSlot.createMany({ data: slotsToCreate });

  const admin = await prisma.user.create({
    data: {
      email: "admin@aqbobek.kz",
      password: hashPassword("admin123"),
      name: "Администратор Aqbobek",
      role: Role.ADMIN,
    },
  });

  await prisma.announcement.createMany({
    data: [
      {
        title: "Подготовка к олимпиаде",
        body: "С 15 числа начинаются дополнительные занятия по математике и физике.",
        targetGrade: 10,
        authorId: admin.id,
      },
      {
        title: "Родительское собрание",
        body: "Общее собрание родителей состоится в актовом зале в пятницу в 18:30.",
        targetGrade: null,
        authorId: admin.id,
      },
      {
        title: "Обновление расписания",
        body: "Проверьте изменения расписания на следующую учебную неделю в личном кабинете.",
        targetGrade: 11,
        authorId: admin.id,
      },
    ],
  });

  await prisma.notification.createMany({
    data: [
      {
        title: "Важно: посещаемость",
        body: "Классным руководителям необходимо проверить пропуски за неделю.",
        targetRole: Role.TEACHER,
        targetClassId: null,
        readBy: [],
      },
      {
        title: "Новый отчет доступен",
        body: "Родители могут посмотреть обновленный недельный отчет успеваемости.",
        targetRole: Role.PARENT,
        targetClassId: null,
        readBy: [],
      },
    ],
  });

  console.log("Seed completed:");
  console.log(`- Classes: ${classes.length}`);
  console.log(`- Students: ${studentProfiles.length}`);
  console.log("- Parents: 75");
  console.log(`- Teachers: ${TEACHERS.length}`);
  console.log(`- Subjects: ${SUBJECTS.length}`);
  console.log(`- Grades: ${totalGradesCreated}`);
  console.log(`- Schedule slots: ${slotsToCreate.length}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
