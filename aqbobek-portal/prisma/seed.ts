import "dotenv/config";
import { createHash } from "crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, PortfolioItemType, Role } from "@prisma/client";

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
  { name: "Арман Тлеубергенов", subject: "Математика" },
  { name: "Сауле Омарова", subject: "Физика" },
  { name: "Ержан Нургалиев", subject: "Информатика" },
  { name: "Марина Кузнецова", subject: "История" },
  { name: "Гульмира Алимбекова", subject: "Биология" },
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
  return createHash("sha256").update(raw).digest("hex");
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
  const failingStudentIndexes = new Set<number>();
  while (failingStudentIndexes.size < 12) {
    failingStudentIndexes.add(randomInt(0, 74));
  }

  const studentProfiles: Array<{
    id: string;
    classId: string;
    className: string;
    fullName: string;
  }> = [];

  let studentCounter = 0;
  for (const currentClass of classes) {
    for (let i = 0; i < 25; i += 1) {
      const fullName = studentNames[studentCounter];

      const studentUser = await prisma.user.create({
        data: {
          email: `student${String(studentCounter + 1).padStart(3, "0")}@aqbobek.kz`,
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

      const isFailingStudent = failingStudentIndexes.has(studentCounter);
      const gradeRows = SUBJECTS.flatMap((subject) => {
        const topics = TOPICS_BY_SUBJECT[subject];

        return Array.from({ length: 10 }).map(() => {
          let score = randomInt(60, 95);
          if (isFailingStudent && Math.random() < 0.55) {
            score = randomInt(30, 55);
          } else if (!isFailingStudent && Math.random() < 0.08) {
            score = randomInt(45, 59);
          }

          return {
            studentId: studentProfile.id,
            subject,
            topic: topics[randomInt(0, topics.length - 1)].name,
            score,
            attendance: Math.random() < 0.9,
            date: randomDateWithinLast90Days(),
          };
        });
      });

      await prisma.grade.createMany({ data: gradeRows });

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
  console.log("- Grades: 3750");
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
