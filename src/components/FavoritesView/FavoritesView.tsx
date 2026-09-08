import { Star } from "lucide-react";
import { useTaskStore } from "../../store/taskStore";
import { useGroupStore } from "../../store/groupStore";
import { TaskItem } from "../TaskList/TaskItem";
import { ui } from "../../theme";
import { PageHeader } from "../chrome";

export function FavoritesView() {
  const { getFavoritedTasks } = useTaskStore();
  const { groups } = useGroupStore();

  const favTasks = getFavoritedTasks();

  // 按分组聚合
  const groupMap = new Map(groups.map((g) => [g.id, g]));

  // 获取唯一的分组 ID（保持分组顺序）
  const groupIds = Array.from(
    new Set(favTasks.map((t) => t.groupId))
  ).sort((a, b) => {
    const ga = groupMap.get(a);
    const gb = groupMap.get(b);
    return (ga?.order ?? 0) - (gb?.order ?? 0);
  });

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "transparent" }}>
      <PageHeader
        title="收藏"
        count={favTasks.length}
        leading={<Star size={18} color="#D97706" fill="#D97706" />}
      />

      {/* 内容区 */}
      <div style={{ flex: 1, overflowY: "auto", padding: "4px 16px 16px" }}>
        {favTasks.length === 0 ? (
          /* 空状态 */
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", height: "100%", padding: 40, textAlign: "center",
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: "50%",
              backgroundColor: "#FEF3C7",
              display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: 16,
            }}>
              <Star size={22} color="#F59E0B" />
            </div>
            <p style={{ fontSize: 15, fontWeight: 600, color: ui.muted, marginBottom: 6 }}>还没有收藏</p>
            <p style={{ fontSize: 13, color: ui.faint }}>在任务上点星标，就会出现在这里</p>
          </div>
        ) : (
          /* 按分组展示 */
          groupIds.map((gid) => {
            const group = groupMap.get(gid);
            const tasks = favTasks.filter((t) => t.groupId === gid);
            if (!group || tasks.length === 0) return null;
            return (
              <div key={gid}>
                {/* 分组标题 */}
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "10px 6px 8px",
                }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: "50%",
                    backgroundColor: group.color, flexShrink: 0,
                  }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: group.color, letterSpacing: "0.04em" }}>
                    {group.name}
                  </span>
                  <span style={{
                    fontSize: 11, color: "#bbb",
                    background: "#F3F4F6", borderRadius: 8, padding: "0px 6px",
                  }}>
                    {tasks.length}
                  </span>
                </div>

                {/* 该分组下的收藏任务 */}
                {tasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    accentColor={group.color}
                  />
                ))}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
