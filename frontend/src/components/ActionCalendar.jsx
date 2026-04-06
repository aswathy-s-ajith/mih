import React, { useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { Calendar as CalendarIcon, User, Clock, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';

const ActionCalendar = ({ decisions }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Filter and parse action items with valid dates
  const actionItems = decisions.filter(d => 
    d.type === 'action_item' && 
    d.due_date && 
    !isNaN(Date.parse(d.due_date))
  ).map(item => ({
    ...item,
    parsedDate: new Date(item.due_date)
  }));

  const getTasksForDate = (date) => {
    return actionItems.filter(item => 
      item.parsedDate.toDateString() === date.toDateString()
    );
  };

  const tileContent = ({ date, view }) => {
    if (view === 'month') {
      const tasks = getTasksForDate(date);
      if (tasks.length > 0) {
        const isOverdue = date < new Date() && date.toDateString() !== new Date().toDateString();
        return (
          <div className="flex justify-center mt-1">
            <div className={`w-1.5 h-1.5 rounded-full ${isOverdue ? 'bg-red-500' : 'bg-indigo-500'}`} />
          </div>
        );
      }
    }
    return null;
  };

  const selectedTasks = getTasksForDate(selectedDate);

  if (actionItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
        <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-4">
          <CalendarIcon size={32} />
        </div>
        <h3 className="text-lg font-bold text-slate-900">No scheduled tasks yet</h3>
        <p className="text-slate-500 text-sm mt-1 text-center max-w-xs">
          Upload a transcript to automatically extract and schedule action items with deadlines.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Calendar Section */}
      <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm h-fit">
        <style>{`
          .react-calendar { width: 100%; border: none; font-family: inherit; }
          .react-calendar__tile--active { background: #4f46e5 !important; border-radius: 12px; }
          .react-calendar__tile--now { background: #f1f5f9; border-radius: 12px; font-weight: bold; color: #4f46e5; }
          .react-calendar__tile:hover { background: #f8fafc; border-radius: 12px; }
          .react-calendar__navigation button:enabled:hover { background-color: #f8fafc; border-radius: 10px; }
        `}</style>
        <Calendar
          onChange={setSelectedDate}
          value={selectedDate}
          tileContent={tileContent}
          nextLabel={<ChevronRight size={20} />}
          prevLabel={<ChevronLeft size={20} />}
          className="rounded-2xl"
        />
      </div>

      {/* Agenda Section */}
      <div className="space-y-6">
        <h3 className="font-bold text-slate-900 flex items-center gap-2">
          Agenda for {selectedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </h3>
        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
          {selectedTasks.length === 0 ? (
            <p className="text-slate-400 text-sm italic py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              No tasks due on this date
            </p>
          ) : (
            selectedTasks.map((task) => {
              const isOverdue = task.parsedDate < new Date() && task.parsedDate.toDateString() !== new Date().toDateString();
              return (
                <div key={task.id} className={`p-4 rounded-2xl border bg-white shadow-sm transition-all border-l-4 ${isOverdue ? 'border-l-red-500 border-slate-200' : 'border-l-indigo-500 border-slate-200'}`}>
                  <p className="text-sm font-semibold text-slate-800 leading-relaxed mb-3">
                    {task.description}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg text-[10px] font-bold text-slate-600 uppercase tracking-tight">
                      <User size={12} />
                      {task.owner || 'Unassigned'}
                    </div>
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-tight ${isOverdue ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-600'}`}>
                      {isOverdue ? <AlertCircle size={12} /> : <Clock size={12} />}
                      {task.due_date}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default ActionCalendar;