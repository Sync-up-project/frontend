export type ScheduleUser = {
  id: string;
  nickname: string | null;
  profileImageUrl?: string | null;
};

export type ProjectCalendarEventAssignee = {
  id: string;
  eventId: string;
  userId: string;
  user: ScheduleUser;
};

export type ProjectCalendarEvent = {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string;
  isAllDay: boolean;
  type: string;
  status: string;
  priority: string;
  progress: number;
  memo: string | null;
  completedAt: string | null;
  order: number;
  isCompleted?: boolean;
  overdue?: boolean;
  dueSoon?: boolean;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: ScheduleUser | null;
  assignees: ProjectCalendarEventAssignee[];
};

export type GetProjectCalendarEventsResponse = {
  events: ProjectCalendarEvent[];
};

export type CreateProjectCalendarEventRequest = {
  title: string;
  description?: string | null;
  startAt: string;
  endAt: string;
  isAllDay?: boolean;
  type?: string;
  status?: string;
  priority?: string;
  progress?: number;
  memo?: string | null;
  assigneeIds?: string[];
};

export type UpdateProjectCalendarEventRequest = Partial<CreateProjectCalendarEventRequest>;

export type CalendarEventsSummaryMember = {
  userId: string;
  nickname: string | null;
  email: string | null;
  roleInProject: string | null;
  position: string | null;
  assignedTasks: number;
  doneTasks: number;
  inProgressTasks: number;
  averageProgress: number;
  overdueTasks: number;
  currentTasks: ProjectCalendarEvent[];
  doneTaskList: ProjectCalendarEvent[];
};

export type GetProjectCalendarEventsSummaryResponse = {
  totalTasks: number;
  todoTasks: number;
  inProgressTasks: number;
  reviewTasks: number;
  doneTasks: number;
  blockedTasks: number;
  averageProgress: number;
  overdueTasks: number;
  dueSoonTasks: number;
  members: CalendarEventsSummaryMember[];
  project?: { id?: string; ownerId?: string };
};
