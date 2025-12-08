import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { ProfileViewComponent } from './components/profile-view.component';
import { ProfileEditComponent } from './components/profile-edit.component';
import { ChangePasswordComponent } from './components/change-password.component';
import { ProfileService } from './services/profile.service';
import { AuthGuard } from '../../services/auth.guard';

const routes: Routes = [
  { path: '', redirectTo: 'view', pathMatch: 'full' },
  { path: 'view', component: ProfileViewComponent },
  { path: 'edit', component: ProfileEditComponent },
  { path: 'change-password', component: ChangePasswordComponent }
];

@NgModule({
  declarations: [
    ProfileViewComponent,
    ProfileEditComponent,
    ChangePasswordComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes)
  ],
  providers: [
    ProfileService
  ]
})
export class ProfileModule { }