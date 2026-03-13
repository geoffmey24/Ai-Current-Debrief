/* ═══════════════════════════════════════════════════════════
   OTTO — Career System
   Manages jobs, salary, promotions, and firing
   ═══════════════════════════════════════════════════════════ */
'use strict';

class CareerSystem {
  constructor() {
    this.currentJobId  = 'unemployed';
    this.monthsInJob   = 0;
    this.careerScore   = 0;   // accumulates from good work decisions
    this.totalJobsHeld = 0;

    // Available entry-level jobs to apply for (by location)
    this.availableJobs = {
      office: ['data_entry', 'developer_junior', 'analyst_junior'],
      cafe:   ['barista'],
      park:   ['teaching_assistant'],
    };

    this._listeners = [];
  }

  onChange(fn) { this._listeners.push(fn); }
  _notify(ev)  { this._listeners.forEach(f => f(ev)); }

  get currentJob() {
    return CAREER_DATA.find(c => c.id === this.currentJobId) || CAREER_DATA[0];
  }

  isEmployed() {
    return this.currentJobId !== 'unemployed';
  }

  // Start a new job
  startJob(jobId) {
    const job = CAREER_DATA.find(c => c.id === jobId);
    if (!job) return false;
    this.currentJobId = jobId;
    this.monthsInJob  = 0;
    this.careerScore  = 0;
    this.totalJobsHeld++;
    this._notify({ type: 'new_job', job });
    return true;
  }

  // Lose current job
  loseJob(reason = 'unknown') {
    const oldJob = this.currentJob;
    this.currentJobId = 'unemployed';
    this.monthsInJob  = 0;
    this.careerScore  = 0;
    this._notify({ type: 'job_lost', job: oldJob, reason });
  }

  // Advance one month — also checks for promotion eligibility
  advanceMonth(stats) {
    if (!this.isEmployed()) return;
    this.monthsInJob++;
    this._checkPromotion(stats);
    this._checkRandomFiring();
  }

  // Add/remove career score from decisions
  addCareerScore(delta) {
    this.careerScore = clamp(this.careerScore + delta, -10, 10);
  }

  _checkPromotion(stats) {
    const job = this.currentJob;
    if (!job.promotionId) return;
    if (this.monthsInJob >= job.promotionMonths &&
        stats.knowledge >= job.promotionKnowledge &&
        this.careerScore >= 2) {
      this._doPromotion(job.promotionId);
    }
  }

  _doPromotion(newJobId) {
    const newJob = CAREER_DATA.find(c => c.id === newJobId);
    if (!newJob) return;
    this.currentJobId = newJobId;
    this.monthsInJob  = 0;
    this.careerScore  = 0;
    this._notify({ type: 'promotion', job: newJob });
  }

  // Random chance of getting fired (if career score is bad)
  _checkRandomFiring() {
    if (this.careerScore <= -3 && chance(0.12)) {
      this.loseJob('poor_performance');
    } else if (chance(0.008)) {
      // Very small random layoff chance
      this.loseJob('downsizing');
    }
  }

  // Force a promotion (used from decision cards)
  forcePromotion() {
    const job = this.currentJob;
    if (job.promotionId) {
      this._doPromotion(job.promotionId);
      return true;
    }
    return false;
  }

  // Get salary for current job
  getCurrentSalary() {
    return this.currentJob.salary;
  }

  // Apply a salary increase (raise)
  applySalaryIncrease(amount) {
    // We modify the stats' salary directly through the event
    this._notify({ type: 'salary_increase', amount });
  }

  // Get available jobs for a location (for "Apply for job" decisions)
  getJobsForLocation(locationId) {
    const ids = this.availableJobs[locationId] || [];
    return ids.map(id => CAREER_DATA.find(c => c.id === id)).filter(Boolean);
  }

  // Can the player get a job at this location?
  canApplyAt(locationId, stats) {
    const jobs = this.getJobsForLocation(locationId);
    return jobs.filter(j => stats.knowledge >= j.requiresKnowledge);
  }

  serialize() {
    return {
      currentJobId:  this.currentJobId,
      monthsInJob:   this.monthsInJob,
      careerScore:   this.careerScore,
      totalJobsHeld: this.totalJobsHeld,
    };
  }

  restore(data) {
    Object.assign(this, data);
  }
}
