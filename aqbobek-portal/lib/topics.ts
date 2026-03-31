export type TopicNode = {
  name: string;
  prerequisites: string[];
};

export const TOPICS_BY_SUBJECT: Record<string, TopicNode[]> = {
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
