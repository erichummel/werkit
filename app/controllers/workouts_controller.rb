class WorkoutsController < ApplicationController
  before_action :set_workout, only: %i[ show edit update destroy index ]

  # GET /workouts or /workouts.json
  def index
    @workouts = Current.user.workouts
  end

  # GET /workouts/1 or /workouts/1.json
  def show
    @include_waypoints = true
  end

  # GET /workouts/new
  def new
    @workout = Workout.new(user: Current.user)
  end

  # GET /workouts/1/edit
  def edit
  end

  # POST /workouts or /workouts.json
  def create
    @workout = Workout.new(params.require(:workout).permit(:user_id, :data_file))
    @workout.user_id = Current.user.id

    respond_to do |format|
      if @workout.save
        format.html { redirect_to workout_url(@workout), notice: "Workout was successfully created." }
        format.json { render :show, status: :created, location: @workout }
      else
        format.html { render :new, status: :unprocessable_content }
        format.json { render json: @workout.errors, status: :unprocessable_content }
      end
    end
  end

  # PATCH/PUT /workouts/1 or /workouts/1.json
  def update
    workout_params = params.require(:workout).permit(:user_id, :data_file)
    respond_to do |format|
      if @workout.update(workout_params)
        format.html { redirect_to workout_url(@workout), notice: "Workout was successfully updated." }
        format.json { render :show, status: :ok, location: @workout }
      else
        format.html { render :edit, status: :unprocessable_content }
        format.json { render json: @workout.errors, status: :unprocessable_content }
      end
    end
  end

  # DELETE /workouts/1 or /workouts/1.json
  def destroy
    @workout.destroy!

    respond_to do |format|
      format.html { redirect_to workouts_url, notice: "Workout was successfully destroyed." }
      format.json { head :no_content }
    end
  end

  private
    # Use callbacks to share common setup or constraints between actions.
    def set_workout
      @workout = params[:id] ? Workout.find(params[:id]) : Workout.new
    end

    # Only allow a list of trusted parameters through.
    def workout_params
      params.fetch(:workout, {})
    end
end
